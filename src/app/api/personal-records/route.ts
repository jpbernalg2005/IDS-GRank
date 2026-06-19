import { auth } from "@/lib/auth";
import { db } from "@/db";
import { personalRecords, exercises, exerciseCategories, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const { exerciseId, weightKg, reps, date, videoUrl, notes } = await req.json();

  await db.insert(personalRecords).values({
    userId,
    exerciseId: Number(exerciseId),
    weightKg: String(weightKg),
    reps: Number(reps),
    date: date ? new Date(date) : new Date(),
    videoUrl,
    notes,
  });

  return Response.json({ success: true }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const rows = await db
    .select({
      userId: personalRecords.userId,
      username: users.username,
      weightKg: sql<string>`MAX(${personalRecords.weightKg})`,
      exerciseName: exercises.name,
      sex: users.sex,
      userWeightKg: users.weightKg,
    })
    .from(personalRecords)
    .innerJoin(users, eq(personalRecords.userId, users.id))
    .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
    .where(categoryId ? eq(exercises.categoryId, Number(categoryId)) : undefined)
    .groupBy(personalRecords.userId, users.username, exercises.name, users.sex, users.weightKg)
    .orderBy(desc(sql`MAX(${personalRecords.weightKg})`));

  return Response.json(rows);
}
