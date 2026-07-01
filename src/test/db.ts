import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
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
 *   beforeEach(async () => { await resetDb(ctx.db); }); // cada test siembra lo suyo
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
 * Vacía todas las tablas y reinicia los contadores de id. Se usa en beforeEach
 * para que cada test arranque con una BD limpia y siembre exactamente los datos
 * que necesita, sin arrastrar estado ni chocar con constraints únicos de otro test.
 */
export async function resetDb(db: TestDb): Promise<void> {
  await db.execute(
    sql.raw(`TRUNCATE TABLE
      user_rewards,
      rewards,
      notifications,
      challenge_participants,
      challenges,
      personal_records,
      workout_plan_exercises,
      workout_plans,
      friendships,
      group_members,
      competition_groups,
      exercises,
      exercise_categories,
      users
      RESTART IDENTITY CASCADE`),
  );
}
