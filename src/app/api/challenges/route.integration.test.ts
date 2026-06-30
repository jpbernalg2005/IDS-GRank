import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from "vitest";
import {
  users,
  friendships,
  competitionGroups,
  groupMembers,
  challenges,
  challengeParticipants,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTestDb, destroyTestDb, resetDb, type TestDbContext } from "@/test/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";

describe("Challenges API (integración)", () => {
  let ctx: TestDbContext;
  let POST: (req: Request) => Promise<Response>;
  let PUT: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.DATABASE_URL = ctx.container.getConnectionUri();
    ({ POST, PUT } = await import("./route"));
  });

  afterAll(async () => {
    await destroyTestDb(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
    vi.clearAllMocks();
  });

  async function seedTwoFriends() {
    const [creator] = await ctx.db
      .insert(users)
      .values({ username: "creator", email: "creator@test.com", passwordHash: "x", sex: "MALE", coins: 100 })
      .returning();
    const [friend] = await ctx.db
      .insert(users)
      .values({ username: "friend1", email: "friend1@test.com", passwordHash: "x", sex: "MALE", coins: 50 })
      .returning();
    await ctx.db.insert(friendships).values({
      requesterId: creator.id,
      addresseeId: friend.id,
      status: "ACCEPTED",
    });
    return { creator, friend };
  }

  async function seedGroup() {
    const [creator] = await ctx.db
      .insert(users)
      .values({ username: "admin", email: "admin@test.com", passwordHash: "x", sex: "MALE", coins: 200 })
      .returning();
    const [m1] = await ctx.db
      .insert(users)
      .values({ username: "member1", email: "m1@test.com", passwordHash: "x", sex: "MALE", coins: 10 })
      .returning();
    const [m2] = await ctx.db
      .insert(users)
      .values({ username: "member2", email: "m2@test.com", passwordHash: "x", sex: "MALE", coins: 10 })
      .returning();
    const [group] = await ctx.db
      .insert(competitionGroups)
      .values({ name: "Test Group", createdBy: creator.id })
      .returning();
    await ctx.db.insert(groupMembers).values([
      { groupId: group.id, userId: creator.id, role: "ADMIN" },
      { groupId: group.id, userId: m1.id, role: "MEMBER" },
      { groupId: group.id, userId: m2.id, role: "MEMBER" },
    ]);
    return { creator, m1, m2, group };
  }

  function req(method: string, body: unknown) {
    return new Request("http://localhost/api/challenges", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // --- CREATE FRIEND ---

  it("crear reto FRIEND descuenta rewardCoins al creador e inserta 1 participante", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });

    const res = await POST(
      req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Press 100kg", rewardCoins: 20 }),
    );
    expect(res.status).toBe(201);

    const creatorRow = await ctx.db.select().from(users).where(eq(users.id, creator.id));
    expect(creatorRow[0].coins).toBe(80);

    const parts = await ctx.db.select().from(challengeParticipants);
    expect(parts).toHaveLength(1);
    expect(parts[0].userId).toBe(friend.id);
    expect(parts[0].status).toBe("PENDING");
    expect(parts[0].settled).toBe(false);
  });

  // --- CREATE GROUP ---

  it("crear reto GROUP descuenta rewardCoins×N e inserta N participantes", async () => {
    const { creator, m1, m2, group } = await seedGroup();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });

    const res = await POST(
      req("POST", { type: "GROUP", groupId: group.id, title: "Squat challenge", rewardCoins: 30 }),
    );
    expect(res.status).toBe(201);

    const creatorRow = await ctx.db.select().from(users).where(eq(users.id, creator.id));
    expect(creatorRow[0].coins).toBe(200 - 30 * 2);

    const parts = await ctx.db.select().from(challengeParticipants);
    expect(parts).toHaveLength(2);
    const partUserIds = parts.map((p) => p.userId).sort();
    expect(partUserIds).toEqual([m1.id, m2.id].sort());
  });

  // --- INSUFFICIENT BALANCE ---

  it("crear reto sin suficientes monedas retorna 400", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });

    const res = await POST(
      req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Imposible", rewardCoins: 999 }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/[Mm]onedas insuficientes/);
  });

  // --- ACCEPT ---

  it("aceptar reto cambia status a ACCEPTED", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Accept test", rewardCoins: 10 }));

    const [part] = await ctx.db.select().from(challengeParticipants);

    (auth as Mock).mockResolvedValue({ user: { id: String(friend.id) } });
    const res = await PUT(req("PUT", { participantId: part.id, action: "accept" }));
    expect(res.status).toBe(200);

    const updated = await ctx.db.select().from(challengeParticipants).where(eq(challengeParticipants.id, part.id));
    expect(updated[0].status).toBe("ACCEPTED");
  });

  // --- DECLINE returns coins ---

  it("rechazar reto devuelve monedas al creador", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Decline test", rewardCoins: 15 }));

    const creatorAfterCreate = await ctx.db.select().from(users).where(eq(users.id, creator.id));
    expect(creatorAfterCreate[0].coins).toBe(85);

    const [part] = await ctx.db.select().from(challengeParticipants);
    (auth as Mock).mockResolvedValue({ user: { id: String(friend.id) } });
    await PUT(req("PUT", { participantId: part.id, action: "decline" }));

    const creatorAfterDecline = await ctx.db.select().from(users).where(eq(users.id, creator.id));
    expect(creatorAfterDecline[0].coins).toBe(100);

    const updatedPart = await ctx.db.select().from(challengeParticipants).where(eq(challengeParticipants.id, part.id));
    expect(updatedPart[0].status).toBe("DECLINED");
    expect(updatedPart[0].settled).toBe(true);
  });

  // --- SUBMIT ---

  it("submit establece videoUrl y status SUBMITTED", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Submit test", rewardCoins: 10 }));

    const [part] = await ctx.db.select().from(challengeParticipants);

    (auth as Mock).mockResolvedValue({ user: { id: String(friend.id) } });
    await PUT(req("PUT", { participantId: part.id, action: "accept" }));
    const res = await PUT(
      req("PUT", { participantId: part.id, action: "submit", videoUrl: "/uploads/video.mp4" }),
    );
    expect(res.status).toBe(200);

    const updated = await ctx.db.select().from(challengeParticipants).where(eq(challengeParticipants.id, part.id));
    expect(updated[0].status).toBe("SUBMITTED");
    expect(updated[0].videoUrl).toBe("/uploads/video.mp4");
    expect(updated[0].submittedAt).toBeTruthy();
  });

  // --- VALIDATE pays coins ---

  it("validar por creador paga monedas al participante y marca VALIDATED", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Validate test", rewardCoins: 25 }));

    const [part] = await ctx.db.select().from(challengeParticipants);

    (auth as Mock).mockResolvedValue({ user: { id: String(friend.id) } });
    await PUT(req("PUT", { participantId: part.id, action: "accept" }));
    await PUT(req("PUT", { participantId: part.id, action: "submit", videoUrl: "/uploads/v.mp4" }));

    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    const res = await PUT(req("PUT", { participantId: part.id, action: "validate" }));
    expect(res.status).toBe(200);

    const friendRow = await ctx.db.select().from(users).where(eq(users.id, friend.id));
    expect(friendRow[0].coins).toBe(50 + 25);

    const updatedPart = await ctx.db.select().from(challengeParticipants).where(eq(challengeParticipants.id, part.id));
    expect(updatedPart[0].status).toBe("VALIDATED");
    expect(updatedPart[0].settled).toBe(true);
  });

  // --- VALIDATE by non-creator → 403 ---

  it("validar por no-creador retorna 403", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Auth test", rewardCoins: 10 }));

    const [part] = await ctx.db.select().from(challengeParticipants);

    (auth as Mock).mockResolvedValue({ user: { id: String(friend.id) } });
    await PUT(req("PUT", { participantId: part.id, action: "accept" }));
    await PUT(req("PUT", { participantId: part.id, action: "submit", videoUrl: "/uploads/v.mp4" }));

    const res = await PUT(req("PUT", { participantId: part.id, action: "validate" }));
    expect(res.status).toBe(403);
  });

  // --- VALIDATE on non-SUBMITTED fails ---

  it("validar participante no SUBMITTED falla", async () => {
    const { creator, friend } = await seedTwoFriends();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "FRIEND", targetUserId: friend.id, title: "State test", rewardCoins: 10 }));

    const [part] = await ctx.db.select().from(challengeParticipants);

    const res = await PUT(req("PUT", { participantId: part.id, action: "validate" }));
    expect(res.status).toBe(400);
  });

  // --- CLOSE returns stake of non-validated ---

  it("cerrar reto devuelve stake de no validados al creador", async () => {
    const { creator, m1, m2, group } = await seedGroup();
    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "GROUP", groupId: group.id, title: "Close test", rewardCoins: 20 }));

    const creatorAfterCreate = await ctx.db.select().from(users).where(eq(users.id, creator.id));
    expect(creatorAfterCreate[0].coins).toBe(200 - 40);

    const parts = await ctx.db.select().from(challengeParticipants);
    const p1 = parts.find((p) => p.userId === m1.id)!;
    const p2 = parts.find((p) => p.userId === m2.id)!;

    (auth as Mock).mockResolvedValue({ user: { id: String(m1.id) } });
    await PUT(req("PUT", { participantId: p1.id, action: "accept" }));
    await PUT(req("PUT", { participantId: p1.id, action: "submit", videoUrl: "/uploads/v.mp4" }));

    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await PUT(req("PUT", { participantId: p1.id, action: "validate" }));

    const challengeRows = await ctx.db.select().from(challenges);
    const res = await PUT(req("PUT", { challengeId: challengeRows[0].id, action: "close" }));
    expect(res.status).toBe(200);

    const creatorFinal = await ctx.db.select().from(users).where(eq(users.id, creator.id));
    expect(creatorFinal[0].coins).toBe(200 - 40 + 20);

    const m1Final = await ctx.db.select().from(users).where(eq(users.id, m1.id));
    expect(m1Final[0].coins).toBe(10 + 20);

    const allParts = await ctx.db.select().from(challengeParticipants);
    expect(allParts.every((p) => p.settled)).toBe(true);
  });

  // --- COIN CONSERVATION ---

  it("conservación de monedas: total antes = total después en flujo completo", async () => {
    const { creator, friend } = await seedTwoFriends();
    const totalBefore = creator.coins + friend.coins;

    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await POST(req("POST", { type: "FRIEND", targetUserId: friend.id, title: "Conservation", rewardCoins: 30 }));

    const [part] = await ctx.db.select().from(challengeParticipants);

    (auth as Mock).mockResolvedValue({ user: { id: String(friend.id) } });
    await PUT(req("PUT", { participantId: part.id, action: "accept" }));
    await PUT(req("PUT", { participantId: part.id, action: "submit", videoUrl: "/uploads/v.mp4" }));

    (auth as Mock).mockResolvedValue({ user: { id: String(creator.id) } });
    await PUT(req("PUT", { participantId: part.id, action: "validate" }));

    const c = await ctx.db.select().from(users).where(eq(users.id, creator.id));
    const f = await ctx.db.select().from(users).where(eq(users.id, friend.id));
    const totalAfter = c[0].coins + f[0].coins;
    expect(totalAfter).toBe(totalBefore);
  });

  it("rechaza con 401 si no hay sesión", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(req("POST", { type: "FRIEND", title: "No auth", rewardCoins: 10 }));
    expect(res.status).toBe(401);
  });
});
