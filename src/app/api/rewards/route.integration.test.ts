import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from "vitest";
import { users, rewards, userRewards, exerciseCategories, exercises, personalRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTestDb, destroyTestDb, resetDb, type TestDbContext } from "@/test/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";

describe("Rewards API (integración)", () => {
  let ctx: TestDbContext;
  let GET: (req: Request) => Promise<Response>;
  let POST: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.DATABASE_URL = ctx.container.getConnectionUri();
    ({ GET, POST } = await import("./route"));
  });

  afterAll(async () => {
    await destroyTestDb(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
    vi.clearAllMocks();
  });

  // --- Helpers ---

  async function seedUser(coins = 500) {
    const [user] = await ctx.db
      .insert(users)
      .values({ username: "tester", email: "tester@test.com", passwordHash: "x", sex: "MALE", coins })
      .returning();
    return user;
  }

  async function seedReward({ costCoins = 100, isActive = true, milestoneKey = null as string | null } = {}) {
    const [reward] = await ctx.db
      .insert(rewards)
      .values({
        name: "Insignia Test",
        description: "Una insignia de prueba",
        type: "BADGE",
        costCoins,
        assetValue: "🏅",
        isActive,
        milestoneKey,
      })
      .returning();
    return reward;
  }

  /** Siembra una categoría con umbral Diamond de 100kg (para pruebas de tier). */
  async function seedCategory() {
    const [category] = await ctx.db
      .insert(exerciseCategories)
      .values({
        name: "Chest",
        tierPlastic: "0",
        tierBronze: "40",
        tierGold: "60",
        tierPlatinum: "80",
        tierEmerald: "90",
        tierDiamond: "100",
        tierChallenger: "140",
      })
      .returning();
    return category;
  }

  async function seedExercise(categoryId: number) {
    const [exercise] = await ctx.db
      .insert(exercises)
      .values({ categoryId, name: "Bench Press" })
      .returning();
    return exercise;
  }

  async function seedPersonalRecord(userId: number, exerciseId: number, weightKg: string) {
    const [record] = await ctx.db
      .insert(personalRecords)
      .values({ userId, exerciseId, weightKg })
      .returning();
    return record;
  }

  function getReq() {
    return new Request("http://localhost/api/rewards", { method: "GET" });
  }

  function postReq(body: unknown) {
    return new Request("http://localhost/api/rewards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // --- GET sin sesión → 401 ---

  it("GET sin sesión retorna 401", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  // --- GET devuelve solo recompensas activas y ownedIds correcto ---

  it("GET devuelve solo recompensas activas y ownedIds del usuario", async () => {
    const user = await seedUser();
    const activeReward = await seedReward({ isActive: true });
    const [inactiveReward] = await ctx.db
      .insert(rewards)
      .values({ name: "Inactiva", type: "BADGE", costCoins: 50, assetValue: "❌", isActive: false })
      .returning();

    // User owns activeReward
    await ctx.db.insert(userRewards).values({ userId: user.id, rewardId: activeReward.id });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await GET(getReq());
    expect(res.status).toBe(200);

    const data = await res.json();
    // Only active rewards
    expect(data.rewards).toHaveLength(1);
    expect(data.rewards[0].id).toBe(activeReward.id);
    expect(data.rewards.find((r: { id: number }) => r.id === inactiveReward.id)).toBeUndefined();
    // ownedIds
    expect(data.ownedIds).toContain(activeReward.id);
    expect(data.ownedIds).not.toContain(inactiveReward.id);
  });

  // --- POST canje válido → 201, descuenta costCoins, crea fila ---

  it("POST canje válido → 201, descuenta costCoins y crea fila en userRewards", async () => {
    const user = await seedUser(300);
    const reward = await seedReward({ costCoins: 150 });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.remainingCoins).toBe(150);

    // Check DB: coins decreased
    const [updatedUser] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updatedUser.coins).toBe(150);

    // Check DB: userRewards row created
    const owned = await ctx.db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, user.id));
    expect(owned).toHaveLength(1);
    expect(owned[0].rewardId).toBe(reward.id);
  });

  // --- POST saldo insuficiente → 400 ---

  it("POST saldo insuficiente retorna 400", async () => {
    const user = await seedUser(50);
    const reward = await seedReward({ costCoins: 200 });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Mm]onedas insuficientes/);
  });

  // --- POST recompensa ya poseída → 400 ---

  it("POST recompensa ya poseída retorna 400", async () => {
    const user = await seedUser(500);
    const reward = await seedReward({ costCoins: 100 });

    // Pre-own the reward
    await ctx.db.insert(userRewards).values({ userId: user.id, rewardId: reward.id });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Yy]a tienes esta recompensa/);
  });

  // --- POST recompensa inactiva → 400 ---

  it("POST recompensa inactiva retorna 400", async () => {
    const user = await seedUser(500);
    const reward = await seedReward({ costCoins: 100, isActive: false });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Rr]ecompensa no disponible/);
  });

  // --- POST recompensa inexistente → 400 ---

  it("POST recompensa inexistente retorna 400", async () => {
    const user = await seedUser(500);

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: 99999 }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Rr]ecompensa no disponible/);
  });

  // --- Conservación: coins baja exactamente en costCoins ---

  it("conservación de monedas: coins del usuario baja exactamente en costCoins", async () => {
    const user = await seedUser(500);
    const reward = await seedReward({ costCoins: 250 });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(201);

    const [updatedUser] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(updatedUser.coins).toBe(500 - 250);

    const data = await res.json();
    expect(data.remainingCoins).toBe(500 - 250);
  });

  // --- POST sin sesión → 401 ---

  it("POST sin sesión retorna 401", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(postReq({ rewardId: 1 }));
    expect(res.status).toBe(401);
  });

  // --- Milestone: FIRST_PR ---

  it("POST FIRST_PR con al menos un PR registrado → 201", async () => {
    const user = await seedUser();
    const category = await seedCategory();
    const exercise = await seedExercise(category.id);
    await seedPersonalRecord(user.id, exercise.id, "50");
    const reward = await seedReward({ costCoins: 0, milestoneKey: "FIRST_PR" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(201);
  });

  it("POST FIRST_PR sin PRs registrados → 400", async () => {
    const user = await seedUser();
    const reward = await seedReward({ costCoins: 0, milestoneKey: "FIRST_PR" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Aa]ún no cumples este logro/);
  });

  // --- Milestone: WEIGHT_100KG ---

  it("POST WEIGHT_100KG con un PR >= 100kg → 201", async () => {
    const user = await seedUser();
    const category = await seedCategory();
    const exercise = await seedExercise(category.id);
    await seedPersonalRecord(user.id, exercise.id, "100");
    const reward = await seedReward({ costCoins: 0, milestoneKey: "WEIGHT_100KG" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(201);
  });

  it("POST WEIGHT_100KG con PRs por debajo de 100kg → 400", async () => {
    const user = await seedUser();
    const category = await seedCategory();
    const exercise = await seedExercise(category.id);
    await seedPersonalRecord(user.id, exercise.id, "99.99");
    const reward = await seedReward({ costCoins: 0, milestoneKey: "WEIGHT_100KG" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Aa]ún no cumples este logro/);
  });

  // --- Milestone: DIAMOND_TIER ---

  it("POST DIAMOND_TIER con un PR que alcanza el tier Diamond → 201", async () => {
    const user = await seedUser();
    const category = await seedCategory(); // tierDiamond = 100
    const exercise = await seedExercise(category.id);
    await seedPersonalRecord(user.id, exercise.id, "100");
    const reward = await seedReward({ costCoins: 0, milestoneKey: "DIAMOND_TIER" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(201);
  });

  it("POST DIAMOND_TIER con PRs por debajo del tier Diamond → 400", async () => {
    const user = await seedUser();
    const category = await seedCategory(); // tierDiamond = 100
    const exercise = await seedExercise(category.id);
    await seedPersonalRecord(user.id, exercise.id, "50"); // tier GOLD
    const reward = await seedReward({ costCoins: 0, milestoneKey: "DIAMOND_TIER" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Aa]ún no cumples este logro/);
  });

  // --- Milestone: CONSECUTIVE_WINS_10 (no implementado, siempre rechazado) ---

  it("POST CONSECUTIVE_WINS_10 siempre retorna 400 (lógica de rachas aún no implementada)", async () => {
    const user = await seedUser();
    const reward = await seedReward({ costCoins: 0, milestoneKey: "CONSECUTIVE_WINS_10" });

    (auth as Mock).mockResolvedValue({ user: { id: String(user.id) } });
    const res = await POST(postReq({ rewardId: reward.id }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/[Nn]o está disponible/);
  });
});
