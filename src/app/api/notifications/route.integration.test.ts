import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from "vitest";
import {
  users,
  notifications,
  friendships,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTestDb, destroyTestDb, resetDb, type TestDbContext } from "@/test/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";

describe("Notifications API (integración)", () => {
  let ctx: TestDbContext;
  let GET: () => Promise<Response>;
  let PUT: (req: Request) => Promise<Response>;
  let POST_friends: (req: Request) => Promise<Response>;
  let PUT_friends: (req: Request) => Promise<Response>;
  let POST_challenges: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.DATABASE_URL = ctx.container.getConnectionUri();
    // Dynamic imports after DATABASE_URL is set so all route handlers share the same db connection
    ({ GET, PUT } = await import("./route"));
    ({ POST: POST_friends, PUT: PUT_friends } = await import("@/app/api/friends/route"));
    ({ POST: POST_challenges } = await import("@/app/api/challenges/route"));
  });

  afterAll(async () => {
    await destroyTestDb(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
    vi.clearAllMocks();
  });

  /** Seed a single user and return it */
  async function seedUser(overrides: { username?: string; email?: string; coins?: number } = {}) {
    const [user] = await ctx.db
      .insert(users)
      .values({
        username: overrides.username ?? "testuser",
        email: overrides.email ?? "test@test.com",
        passwordHash: "x",
        sex: "MALE",
        coins: overrides.coins ?? 100,
      })
      .returning();
    return user;
  }

  /** Insert a notification directly into the DB */
  async function seedNotification(userId: number, overrides: Partial<typeof notifications.$inferInsert> = {}) {
    const [notif] = await ctx.db
      .insert(notifications)
      .values({
        userId,
        type: "TEST",
        title: "Notificación de prueba",
        ...overrides,
      })
      .returning();
    return notif;
  }

  function putReq(body: unknown) {
    return new Request("http://localhost/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function apiReq(method: string, url: string, body: unknown) {
    return new Request(`http://localhost${url}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // ─── GET ───────────────────────────────────────────────────────────────────

  it("GET sin sesión retorna 401", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET retorna solo las notificaciones del usuario autenticado", async () => {
    const user1 = await seedUser({ username: "u1", email: "u1@test.com" });
    const user2 = await seedUser({ username: "u2", email: "u2@test.com" });

    await seedNotification(user1.id, { title: "Para user1" });
    await seedNotification(user2.id, { title: "Para user2" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user1.id) } });
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].title).toBe("Para user1");
    expect(data.unreadCount).toBe(1);
  });

  it("GET devuelve unreadCount correcto cuando algunas están leídas", async () => {
    const user = await seedUser();

    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: true });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await GET();
    const data = await res.json();
    expect(data.notifications).toHaveLength(3);
    expect(data.unreadCount).toBe(2);
  });

  // ─── PUT read ──────────────────────────────────────────────────────────────

  it("PUT read marca una notificación como leída y la otra sigue sin leer", async () => {
    const user = await seedUser();
    const n1 = await seedNotification(user.id, { isRead: false });
    const n2 = await seedNotification(user.id, { isRead: false });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });

    const res = await PUT(putReq({ action: "read", id: n1.id }));
    expect(res.status).toBe(200);

    const [updatedN1] = await ctx.db.select().from(notifications).where(eq(notifications.id, n1.id));
    expect(updatedN1.isRead).toBe(true);

    const [updatedN2] = await ctx.db.select().from(notifications).where(eq(notifications.id, n2.id));
    expect(updatedN2.isRead).toBe(false);
  });

  it("PUT read de notificación de otro usuario retorna 403 sin cambios", async () => {
    const user1 = await seedUser({ username: "u1", email: "u1@test.com" });
    const user2 = await seedUser({ username: "u2", email: "u2@test.com" });

    const notif = await seedNotification(user2.id, { isRead: false });

    (auth as Mock).mockResolvedValue({ user: { id: String(user1.id) } });
    const res = await PUT(putReq({ action: "read", id: notif.id }));
    expect(res.status).toBe(403);

    const [unchanged] = await ctx.db.select().from(notifications).where(eq(notifications.id, notif.id));
    expect(unchanged.isRead).toBe(false);
  });

  it("PUT read de notificación inexistente retorna 404", async () => {
    const user = await seedUser();
    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });

    const res = await PUT(putReq({ action: "read", id: 99999 }));
    expect(res.status).toBe(404);
  });

  // ─── PUT readAll ───────────────────────────────────────────────────────────

  it("PUT readAll marca todas las notificaciones del usuario como leídas", async () => {
    const user = await seedUser();
    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: false });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await PUT(putReq({ action: "readAll" }));
    expect(res.status).toBe(200);

    const rows = await ctx.db.select().from(notifications).where(eq(notifications.userId, user.id));
    expect(rows.every((n) => n.isRead)).toBe(true);
  });

  it("PUT readAll no afecta las notificaciones de otros usuarios", async () => {
    const user1 = await seedUser({ username: "u1", email: "u1@test.com" });
    const user2 = await seedUser({ username: "u2", email: "u2@test.com" });

    await seedNotification(user1.id, { isRead: false });
    const n2 = await seedNotification(user2.id, { isRead: false });

    (auth as Mock).mockResolvedValue({ user: { id: String(user1.id) } });
    await PUT(putReq({ action: "readAll" }));

    const [user2Notif] = await ctx.db.select().from(notifications).where(eq(notifications.id, n2.id));
    expect(user2Notif.isRead).toBe(false);
  });

  // ─── PUT invalid ───────────────────────────────────────────────────────────

  it("PUT con acción inválida retorna 400", async () => {
    const user = await seedUser();
    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });

    const res = await PUT(putReq({ action: "destroy" }));
    expect(res.status).toBe(400);
  });

  it("PUT sin sesión retorna 401", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await PUT(putReq({ action: "readAll" }));
    expect(res.status).toBe(401);
  });

  // ─── Event-driven notifications ────────────────────────────────────────────

  it("crear solicitud de amistad genera notificación FRIEND_REQUEST al destinatario", async () => {
    const u1 = await seedUser({ username: "alice", email: "alice@test.com" });
    const u2 = await seedUser({ username: "bob", email: "bob@test.com" });

    (auth as Mock).mockResolvedValue({ user: { id: String(u1.id), name: "alice" } });
    const res = await POST_friends(apiReq("POST", "/api/friends", { username: "bob" }));
    expect(res.status).toBe(201);

    const notifs = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, u2.id));
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("FRIEND_REQUEST");
  });

  it("aceptar solicitud genera notificación FRIEND_ACCEPTED al solicitante", async () => {
    const u1 = await seedUser({ username: "alice2", email: "alice2@test.com" });
    const u2 = await seedUser({ username: "bob2", email: "bob2@test.com" });

    // u1 sends request
    (auth as Mock).mockResolvedValue({ user: { id: String(u1.id), name: "alice2" } });
    await POST_friends(apiReq("POST", "/api/friends", { username: "bob2" }));

    const [friendship] = await ctx.db
      .select()
      .from(friendships)
      .where(eq(friendships.requesterId, u1.id));

    // u2 accepts
    (auth as Mock).mockResolvedValue({ user: { id: String(u2.id), name: "bob2" } });
    const res = await PUT_friends(
      apiReq("PUT", "/api/friends", { friendshipId: friendship.id, action: "accept" }),
    );
    expect(res.status).toBe(200);

    const notifs = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, u1.id));

    const accepted = notifs.find((n) => n.type === "FRIEND_ACCEPTED");
    expect(accepted).toBeDefined();
  });

  it("crear reto genera notificación CHALLENGE_RECEIVED a cada participante", async () => {
    const u1 = await seedUser({ username: "creator3", email: "creator3@test.com", coins: 200 });
    const u2 = await seedUser({ username: "friend3", email: "friend3@test.com" });

    await ctx.db.insert(friendships).values({
      requesterId: u1.id,
      addresseeId: u2.id,
      status: "ACCEPTED",
    });

    (auth as Mock).mockResolvedValue({ user: { id: String(u1.id), name: "creator3" } });
    const res = await POST_challenges(
      apiReq("POST", "/api/challenges", {
        type: "FRIEND",
        targetUserId: u2.id,
        title: "Press banca 100kg",
        rewardCoins: 10,
      }),
    );
    expect(res.status).toBe(201);

    const notifs = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, u2.id));

    const challengeNotif = notifs.find((n) => n.type === "CHALLENGE_RECEIVED");
    expect(challengeNotif).toBeDefined();
    expect(challengeNotif?.title).toContain("Press banca 100kg");
  });
});
