import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from "vitest";
import { users, rewards, userRewards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTestDb, destroyTestDb, resetDb, type TestDbContext } from "@/test/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";

describe("Rewards Equip API (integración)", () => {
  let ctx: TestDbContext;
  let POST: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.DATABASE_URL = ctx.container.getConnectionUri();
    ({ POST } = await import("./route"));
  });

  afterAll(async () => {
    await destroyTestDb(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
    vi.clearAllMocks();
  });

  // --- Helpers ---

  async function seedUser() {
    const [user] = await ctx.db
      .insert(users)
      .values({ username: "tester", email: "tester@test.com", passwordHash: "x", sex: "MALE" })
      .returning();
    return user;
  }

  async function seedReward(type: string, overrides: Partial<{ name: string; assetValue: string }> = {}) {
    const [reward] = await ctx.db
      .insert(rewards)
      .values({
        name: overrides.name ?? `Reward ${type}`,
        description: "Una recompensa de prueba",
        type,
        costCoins: 0,
        assetValue: overrides.assetValue ?? "🔥",
      })
      .returning();
    return reward;
  }

  async function own(userId: number, rewardId: number) {
    await ctx.db.insert(userRewards).values({ userId, rewardId });
  }

  function postReq(body: unknown) {
    return new Request("http://localhost/api/rewards/equip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // --- Auth ---

  it("POST sin sesión retorna 401", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(postReq({ rewardId: 1, action: "equip" }));
    expect(res.status).toBe(401);
  });

  // --- Equip a frame ---

  it("equipa un AVATAR_FRAME poseído → 200 y actualiza equippedFrameRewardId", async () => {
    const user = await seedUser();
    const frame = await seedReward("AVATAR_FRAME");
    await own(user.id, frame.id);

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: frame.id, action: "equip" }));
    expect(res.status).toBe(200);

    const [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.equippedFrameRewardId).toBe(frame.id);
    expect(updated.equippedTitleRewardId).toBeNull();
  });

  // --- Equip a title ---

  it("equipa un TITLE poseído → 200 y actualiza equippedTitleRewardId", async () => {
    const user = await seedUser();
    const title = await seedReward("TITLE", { assetValue: "La Bestia" });
    await own(user.id, title.id);

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: title.id, action: "equip" }));
    expect(res.status).toBe(200);

    const [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.equippedTitleRewardId).toBe(title.id);
    expect(updated.equippedFrameRewardId).toBeNull();
  });

  // --- Ownership validation ---

  it("equipar una recompensa no poseída retorna 400", async () => {
    const user = await seedUser();
    const frame = await seedReward("AVATAR_FRAME");

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: frame.id, action: "equip" }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/no posees/i);

    const [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.equippedFrameRewardId).toBeNull();
  });

  // --- Type validation ---

  it("equipar una BADGE retorna 400", async () => {
    const user = await seedUser();
    const badge = await seedReward("BADGE");
    await own(user.id, badge.id);

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: badge.id, action: "equip" }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/no se puede equipar/i);
  });

  // --- Re-equip replaces previous ---

  it("equipar un nuevo AVATAR_FRAME reemplaza el anterior", async () => {
    const user = await seedUser();
    const frame1 = await seedReward("AVATAR_FRAME", { assetValue: "🔥" });
    const frame2 = await seedReward("AVATAR_FRAME", { assetValue: "⚡" });
    await own(user.id, frame1.id);
    await own(user.id, frame2.id);

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });

    await POST(postReq({ rewardId: frame1.id, action: "equip" }));
    let [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.equippedFrameRewardId).toBe(frame1.id);

    await POST(postReq({ rewardId: frame2.id, action: "equip" }));
    [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.equippedFrameRewardId).toBe(frame2.id);
  });

  // --- Unequip ---

  it("unequip pone la columna en null", async () => {
    const user = await seedUser();
    const title = await seedReward("TITLE", { assetValue: "Leyenda Viviente" });
    await own(user.id, title.id);

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });

    await POST(postReq({ rewardId: title.id, action: "equip" }));
    let [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.equippedTitleRewardId).toBe(title.id);

    const res = await POST(postReq({ rewardId: title.id, action: "unequip" }));
    expect(res.status).toBe(200);

    [updated] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updated.equippedTitleRewardId).toBeNull();
  });

  // --- Bad payload ---

  it("acción inválida retorna 400", async () => {
    const user = await seedUser();
    const frame = await seedReward("AVATAR_FRAME");
    await own(user.id, frame.id);

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: frame.id, action: "toggle" }));
    expect(res.status).toBe(400);
  });

  it("recompensa inexistente retorna 400", async () => {
    const user = await seedUser();

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: 99999, action: "equip" }));
    expect(res.status).toBe(400);
  });
});
