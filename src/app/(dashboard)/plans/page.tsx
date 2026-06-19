import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);
  const plans = await db.query.workoutPlans.findMany({
    where: eq(workoutPlans.userId, userId),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl tracking-wide">Planes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tus rutinas de entrenamiento</p>
        </div>
        <Link
          href="/plans/create"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Plan
        </Link>
      </div>

      {plans.length > 0 ? (
        <div className="space-y-2">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-lg tracking-wide">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description || "Sin descripción"}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No tienes planes de entrenamiento</p>
          <Link
            href="/plans/create"
            className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Crear mi primer plan
          </Link>
        </div>
      )}
    </div>
  );
}
