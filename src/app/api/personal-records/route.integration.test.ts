import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from "vitest";
import { exerciseCategories, exercises, users, personalRecords } from "@/db/schema";
import { createTestDb, destroyTestDb, resetDb, type TestDbContext } from "@/test/db";

/**
 * Test de INTEGRACIÓN del registro de PR (CU-1), con video opcional.
 * La escritura va contra un Postgres real (Testcontainers); solo se mockea la
 * SESIÓN (@/lib/auth), porque la autenticación no es parte de lo que se prueba aquí.
 * Cada test siembra el usuario y el ejercicio que necesita (claves foráneas).
 */
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";

describe("POST /api/personal-records (integración)", () => {
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

  /** Siembra una categoría, un ejercicio y un usuario; devuelve sus ids. */
  async function seedUserAndExercise() {
    const [category] = await ctx.db
      .insert(exerciseCategories)
      .values({ name: "Chest", description: "Pecho" })
      .returning();
    const [exercise] = await ctx.db
      .insert(exercises)
      .values({ categoryId: category.id, name: "Bench Press" })
      .returning();
    const [user] = await ctx.db
      .insert(users)
      .values({ username: "tester", email: "tester@grank.com", passwordHash: "x", sex: "MALE" })
      .returning();
    return { exerciseId: exercise.id, userId: user.id };
  }

  function buildRequest(body: unknown) {
    return new Request("http://localhost/api/personal-records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rechaza con 401 si no hay sesión", async () => {
    (auth as Mock).mockResolvedValue(null);

    const res = await POST(buildRequest({ exerciseId: 1, weightKg: 100, reps: 5 }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("No autorizado");
  });

  it("guarda el PR con el video cuando se envía videoUrl", async () => {
    const { exerciseId, userId } = await seedUserAndExercise();
    (auth as Mock).mockResolvedValue({ user: { id: String(userId) } });

    const res = await POST(
      buildRequest({
        exerciseId,
        weightKg: 100,
        reps: 5,
        videoUrl: "/uploads/pr-video.mp4",
        notes: "Nuevo récord",
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true });

    // Verifica en la BD real que el PR quedó guardado con su video.
    const rows = await ctx.db.select().from(personalRecords);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
    expect(rows[0].exerciseId).toBe(exerciseId);
    expect(rows[0].videoUrl).toBe("/uploads/pr-video.mp4");
    expect(rows[0].weightKg).toBe("100.00");
  });

  it("guarda el PR sin video (video opcional) dejando videoUrl en null", async () => {
    const { exerciseId, userId } = await seedUserAndExercise();
    (auth as Mock).mockResolvedValue({ user: { id: String(userId) } });

    const res = await POST(buildRequest({ exerciseId, weightKg: 90, reps: 3 }));

    expect(res.status).toBe(201);

    const rows = await ctx.db.select().from(personalRecords);
    expect(rows).toHaveLength(1);
    expect(rows[0].videoUrl).toBeNull();
  });
});
