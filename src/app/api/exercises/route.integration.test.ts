import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { exerciseCategories, exercises } from "@/db/schema";
import { createTestDb, destroyTestDb, resetDb, type TestDbContext } from "@/test/db";

/**
 * Test de INTEGRACIÓN del catálogo de ejercicios.
 * Corre contra un Postgres real y efímero (Testcontainers). Cada test siembra
 * los datos que necesita; resetDb deja la BD limpia entre uno y otro.
 *
 * El handler importa `db` desde "@/db", que se conecta usando DATABASE_URL.
 * Por eso fijamos DATABASE_URL al contenedor ANTES de importar el handler.
 */
describe("GET /api/exercises (integración)", () => {
  let ctx: TestDbContext;
  let GET: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    ctx = await createTestDb();
    process.env.DATABASE_URL = ctx.container.getConnectionUri();
    ({ GET } = await import("./route"));
  });

  afterAll(async () => {
    await destroyTestDb(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
  });

  it("devuelve las categorías cuando se pide ?categories=true", async () => {
    // Este test siembra solo categorías.
    await ctx.db.insert(exerciseCategories).values([
      { name: "Chest", description: "Pecho" },
      { name: "Legs", description: "Piernas" },
    ]);

    const res = await GET(new Request("http://localhost/api/exercises?categories=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data.map((c: { name: string }) => c.name).sort()).toEqual(["Chest", "Legs"]);
  });

  it("devuelve los ejercicios (sin filtro) con su categoría asociada", async () => {
    // Este test siembra una categoría y sus ejercicios.
    const [category] = await ctx.db
      .insert(exerciseCategories)
      .values({ name: "Chest", description: "Pecho" })
      .returning();

    await ctx.db.insert(exercises).values([
      { categoryId: category.id, name: "Bench Press" },
      { categoryId: category.id, name: "Incline Bench Press" },
    ]);

    const res = await GET(new Request("http://localhost/api/exercises"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data.every((e: { categoryId: number }) => e.categoryId === category.id)).toBe(true);
  });

  it("devuelve una lista vacía si no hay categorías sembradas", async () => {
    // No siembra nada: verifica el caso borde sobre BD limpia.
    const res = await GET(new Request("http://localhost/api/exercises?categories=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });
});
