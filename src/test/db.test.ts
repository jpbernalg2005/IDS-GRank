import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { exerciseCategories } from "@/db/schema";
import { createTestDb, destroyTestDb, seedTestData, type TestDbContext } from "./db";

/**
 * Smoke test de la infraestructura de testing (Testcontainers + migraciones + seed).
 * No prueba ninguna feature de la app; solo confirma que la BD de test efímera
 * arranca, aplica el schema y queda consultable. Si esto pasa, la base está lista
 * para escribir los tests de integración reales encima.
 */
describe("infraestructura de BD de test", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createTestDb();
  });

  afterAll(async () => {
    await destroyTestDb(ctx);
  });

  it("aplica el schema: la tabla exercise_categories existe y está vacía", async () => {
    const rows = await ctx.db.select().from(exerciseCategories);
    expect(rows).toEqual([]);
  });

  it("siembra datos consultables", async () => {
    const { category, exercises, user } = await seedTestData(ctx.db);

    expect(category.id).toBeTypeOf("number");
    expect(exercises).toHaveLength(2);
    expect(user.username).toBe("tester");

    const found = await ctx.db
      .select()
      .from(exerciseCategories)
      .where(eq(exerciseCategories.id, category.id));

    expect(found).toHaveLength(1);
    expect(found[0].name).toBe("Chest");
  });
});
