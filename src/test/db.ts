import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";

export type TestDb = PostgresJsDatabase<typeof schema>;

export interface TestDbContext {
  container: StartedPostgreSqlContainer;
  client: ReturnType<typeof postgres>;
  db: TestDb;
}

/**
 * Levanta un Postgres 16 efímero en Docker (Testcontainers), aplica el schema
 * vía las migraciones de drizzle y devuelve una conexión drizzle lista para usar.
 *
 * Uso típico en un test:
 *   let ctx: TestDbContext;
 *   beforeAll(async () => { ctx = await createTestDb(); });
 *   afterAll(async () => { await destroyTestDb(ctx); });
 */
export async function createTestDb(): Promise<TestDbContext> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const client = postgres(container.getConnectionUri());
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  return { container, client, db };
}

/** Cierra la conexión y detiene el contenedor. */
export async function destroyTestDb(ctx: TestDbContext): Promise<void> {
  await ctx.client.end();
  await ctx.container.stop();
}

/**
 * Siembra datos mínimos y deterministas para los tests de integración:
 * 1 categoría ("Chest") con umbrales de tier, 2 ejercicios y 1 usuario.
 * Devuelve los ids generados para que cada test arme sus asserts.
 */
export async function seedTestData(db: TestDb) {
  const [category] = await db
    .insert(schema.exerciseCategories)
    .values({
      name: "Chest",
      description: "Ejercicios de pecho",
      tierPlastic: "0",
      tierBronze: "40",
      tierGold: "60",
      tierPlatinum: "80",
      tierEmerald: "100",
      tierDiamond: "120",
      tierChallenger: "140",
    })
    .returning();

  const insertedExercises = await db
    .insert(schema.exercises)
    .values([
      { categoryId: category.id, name: "Bench Press", description: "Press de banca" },
      { categoryId: category.id, name: "Incline Bench Press", description: "Press inclinado" },
    ])
    .returning();

  const [user] = await db
    .insert(schema.users)
    .values({
      username: "tester",
      email: "tester@grank.com",
      passwordHash: "hash-de-prueba",
      sex: "MALE",
      weightKg: "80.00",
    })
    .returning();

  return { category, exercises: insertedExercises, user };
}
