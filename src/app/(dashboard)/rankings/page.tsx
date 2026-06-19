import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, personalRecords, exercises, exerciseCategories } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

async function getTopByCategory(categoryId: number) {
  const results = await db
    .select({
      userId: personalRecords.userId,
      username: users.username,
      maxWeight: sql<string>`MAX(${personalRecords.weightKg})`,
      exerciseName: exercises.name,
    })
    .from(personalRecords)
    .innerJoin(users, eq(personalRecords.userId, users.id))
    .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
    .where(eq(exercises.categoryId, categoryId))
    .groupBy(personalRecords.userId, users.username, exercises.name)
    .orderBy(desc(sql`MAX(${personalRecords.weightKg})`))
    .limit(5);

  return results;
}

export default async function RankingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const categories = await db.query.exerciseCategories.findMany();
  const categoryData = await Promise.all(
    categories.map(async (cat) => ({
      category: cat,
      top: await getTopByCategory(cat.id),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl tracking-wide">Rankings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Los mejores levantadores por categoría</p>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
          Global
        </button>
        <button className="rounded-lg bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
          Por Peso
        </button>
        <button className="rounded-lg bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
          Por Sexo
        </button>
      </div>

      <div className="space-y-6">
        {categoryData.map(({ category: cat, top }) => (
          <div key={cat.id} className="space-y-3">
            <h2 className="font-heading text-2xl tracking-wide text-primary">{cat.name}</h2>
            <div className="space-y-1.5">
              {top.map((row, idx) => (
                <div
                  key={`${row.userId}-${row.exerciseName}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? "bg-yellow-500 text-yellow-950" :
                      idx === 1 ? "bg-slate-300 text-slate-800" :
                      idx === 2 ? "bg-amber-700 text-amber-100" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{row.username}</p>
                      <p className="text-[10px] text-muted-foreground">{row.exerciseName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{row.maxWeight} kg</p>
                  </div>
                </div>
              ))}
              {top.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin registros aún</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
