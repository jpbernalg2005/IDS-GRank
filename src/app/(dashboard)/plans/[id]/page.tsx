import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutPlans, workoutPlanExercises, exercises as exercisesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const planId = Number(id);
  const userId = Number(session.user.id);

  const plan = await db.query.workoutPlans.findFirst({
    where: eq(workoutPlans.id, planId),
  });

  if (!plan || plan.userId !== userId) redirect("/plans");

  const planExercises = await db
    .select({
      id: workoutPlanExercises.id,
      sets: workoutPlanExercises.sets,
      reps: workoutPlanExercises.reps,
      exerciseName: exercisesTable.name,
    })
    .from(workoutPlanExercises)
    .innerJoin(exercisesTable, eq(workoutPlanExercises.exerciseId, exercisesTable.id))
    .where(eq(workoutPlanExercises.planId, planId))
    .orderBy(workoutPlanExercises.orderIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/plans" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-4xl tracking-wide">{plan.name}</h1>
          {plan.description && (
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          )}
        </div>
      </div>

      {planExercises.length > 0 ? (
        <div className="space-y-2">
          {planExercises.map((pe) => (
            <div
              key={pe.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-lg tracking-wide">{pe.exerciseName}</h3>
                  <p className="text-xs text-muted-foreground">{pe.sets} series × {pe.reps} reps</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Este plan no tiene ejercicios</p>
        </div>
      )}
    </div>
  );
}
