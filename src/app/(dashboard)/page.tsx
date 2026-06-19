import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, personalRecords, exercises, exerciseCategories } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Trophy, TrendingUp, Users } from "lucide-react";
import { PRCard } from "@/components/pr-card";
import { getTier, TIER_POINTS, TIER_LABELS, TIER_COLORS, type Tier } from "@/lib/tiers";

async function getUserRanking(userId: number) {
  const categories = await db.query.exerciseCategories.findMany();
  const prs = await db
    .select({
      weightKg: personalRecords.weightKg,
      categoryId: exercises.categoryId,
    })
    .from(personalRecords)
    .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
    .where(eq(personalRecords.userId, userId));

  if (prs.length === 0) return { points: 0, bestTier: undefined as Tier | undefined };

  let bestTier: Tier = "PLASTIC";
  let topPoints = 0;
  for (const pr of prs) {
    const cat = categories.find((c) => c.id === pr.categoryId);
    if (!cat) continue;
    const tier = getTier(Number(pr.weightKg), cat);
    const p = TIER_POINTS[tier];
    if (p > topPoints) { topPoints = p; bestTier = tier; }
  }

  return { points: topPoints, bestTier };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) redirect("/login");

  const allCategories = await db.query.exerciseCategories.findMany();

  const recentPRs = await db
    .select({
      id: personalRecords.id,
      weightKg: personalRecords.weightKg,
      reps: personalRecords.reps,
      date: personalRecords.date,
      exerciseId: personalRecords.exerciseId,
      exerciseName: exercises.name,
      categoryId: exercises.categoryId,
      categoryName: exerciseCategories.name,
    })
    .from(personalRecords)
    .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
    .innerJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
    .where(eq(personalRecords.userId, userId))
    .orderBy(desc(personalRecords.date))
    .limit(5);

  const recentPRsWithTier = recentPRs.map((pr) => {
    const cat = allCategories.find((c) => c.id === pr.categoryId);
    const tier = cat ? getTier(Number(pr.weightKg), cat) : undefined;
    return { ...pr, tier };
  });

  const ranking = await getUserRanking(userId);

  const totalPRCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(personalRecords)
    .where(eq(personalRecords.userId, userId));

  const stats = [
    { label: "PRs Totales", value: totalPRCount[0]?.count || 0, icon: Dumbbell, color: "text-primary" },
    { label: "Mejor Rango", value: ranking.bestTier ? TIER_LABELS[ranking.bestTier] : "—", icon: Trophy, color: "text-yellow-500", tier: ranking.bestTier },
    { label: "Puntos", value: ranking.points, icon: TrendingUp, color: "text-green-500" },
    { label: "Amigos", value: "0", icon: Users, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl tracking-wide">
          Bienvenido, <span className="text-primary">{user.username}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.sex === "MALE" ? "Masculino" : "Femenino"} · {user.weightKg ? `${user.weightKg} kg` : "Peso no registrado"} · {user.experienceLevel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              {"tier" in stat && stat.tier ? (
                <p className={`mt-1 text-2xl font-bold uppercase ${TIER_COLORS[stat.tier as Tier]}`}>
                  {stat.value}
                </p>
              ) : (
                <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl tracking-wide">Últimos PRs</h2>
          <Link href="/exercises" className="text-xs font-medium text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {recentPRs.length > 0 ? (
          <div className="space-y-2">
            {recentPRsWithTier.map((pr) => (
              <PRCard
                key={pr.id}
                exercise={pr.exerciseName}
                category={pr.categoryName}
                weight={String(pr.weightKg)}
                reps={pr.reps}
                tier={pr.tier}
                date={pr.date?.toISOString()}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Aún no tienes PRs registrados</p>
            <Link
              href="/exercises"
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Registrar mi primer PR
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
