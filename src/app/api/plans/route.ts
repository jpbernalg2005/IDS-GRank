import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutPlans, workoutPlanExercises } from "@/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { name, description, exercises } = await req.json();

  const [plan] = await db.insert(workoutPlans).values({
    userId,
    name,
    description,
  }).returning();

  if (exercises && exercises.length > 0) {
    await db.insert(workoutPlanExercises).values(
      exercises.map((ex: { exerciseId: string; sets: string; reps: string }, idx: number) => ({
        planId: plan.id,
        exerciseId: Number(ex.exerciseId),
        sets: Number(ex.sets),
        reps: ex.reps,
        orderIndex: idx,
      }))
    );
  }

  return Response.json(plan, { status: 201 });
}
