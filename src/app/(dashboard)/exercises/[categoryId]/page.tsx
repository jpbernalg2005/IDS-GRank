import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exercises, exerciseCategories, personalRecords } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PRCard } from "@/components/pr-card";
import { ArrowLeft } from "lucide-react";

export default async function CategoryExercisesPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { categoryId } = await params;
  const catId = Number(categoryId);
  const userId = Number(session.user.id);

  const category = await db.query.exerciseCategories.findFirst({ where: eq(exerciseCategories.id, catId) });
  if (!category) redirect("/exercises");

  const exerciseList = await db.query.exercises.findMany({
    where: eq(exercises.categoryId, catId),
  });

  const getPR = async (exerciseId: number) => {
    const pr = await db.query.personalRecords.findFirst({
      where: (prs, { and }) => and(
        eq(prs.userId, userId),
        eq(prs.exerciseId, exerciseId)
      ),
      orderBy: [desc(personalRecords.weightKg)],
    });
    return pr;
  };

  const prs = await Promise.all(exerciseList.map((ex) => getPR(ex.id)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/exercises" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-4xl tracking-wide">{category.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {exerciseList.map((ex, idx) => {
          const pr = prs[idx];
          return (
            <Link
              key={ex.id}
              href={`/exercises/new-pr?exerciseId=${ex.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg tracking-wide">{ex.name}</h3>
                  <p className="text-xs text-muted-foreground">{ex.description || "Sin descripción"}</p>
                </div>
                {pr ? (
                  <div className="text-right">
                    <p className="text-sm font-bold">{pr.weightKg} kg</p>
                    <p className="text-[10px] text-muted-foreground">× {pr.reps} reps</p>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin PR</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
