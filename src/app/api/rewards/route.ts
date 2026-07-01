import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, rewards, userRewards, personalRecords, exercises, exerciseCategories } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getTier, TIERS } from "@/lib/tiers";

async function isEligibleForMilestone(userId: number, milestoneKey: string): Promise<boolean> {
  switch (milestoneKey) {
    case "FIRST_PR": {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(personalRecords)
        .where(eq(personalRecords.userId, userId));
      return Number(row.count) >= 1;
    }
    case "WEIGHT_100KG": {
      const [row] = await db
        .select({ id: personalRecords.id })
        .from(personalRecords)
        .where(and(eq(personalRecords.userId, userId), gte(personalRecords.weightKg, "100")))
        .limit(1);
      return !!row;
    }
    case "DIAMOND_TIER": {
      const records = await db
        .select({
          weightKg: personalRecords.weightKg,
          tierPlastic: exerciseCategories.tierPlastic,
          tierBronze: exerciseCategories.tierBronze,
          tierGold: exerciseCategories.tierGold,
          tierPlatinum: exerciseCategories.tierPlatinum,
          tierEmerald: exerciseCategories.tierEmerald,
          tierDiamond: exerciseCategories.tierDiamond,
          tierChallenger: exerciseCategories.tierChallenger,
        })
        .from(personalRecords)
        .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
        .innerJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
        .where(eq(personalRecords.userId, userId));

      return records.some((r) => {
        const tier = getTier(Number(r.weightKg), r);
        return TIERS.indexOf(tier) >= TIERS.indexOf("DIAMOND");
      });
    }
    default:
      return true;
  }
}

export async function GET(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);

  const allRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.isActive, true));

  const owned = await db
    .select({ rewardId: userRewards.rewardId })
    .from(userRewards)
    .where(eq(userRewards.userId, userId));

  const ownedIds = owned.map((r) => r.rewardId);

  return Response.json({ rewards: allRewards, ownedIds });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const body = await req.json();
  const { rewardId } = body;

  if (!rewardId) return Response.json({ error: "rewardId requerido" }, { status: 400 });

  // Check reward exists and is active
  const reward = await db.query.rewards.findFirst({ where: eq(rewards.id, rewardId) });
  if (!reward || !reward.isActive) {
    return Response.json({ error: "Recompensa no disponible" }, { status: 400 });
  }

  // Check if user already owns it
  const existing = await db.query.userRewards.findFirst({
    where: and(eq(userRewards.userId, userId), eq(userRewards.rewardId, rewardId)),
  });
  if (existing) {
    return Response.json({ error: "Ya tienes esta recompensa" }, { status: 400 });
  }

  // Check milestone eligibility (for BADGE rewards tied to an achievement)
  if (reward.milestoneKey) {
    if (reward.milestoneKey === "CONSECUTIVE_WINS_10") {
      return Response.json({ error: "Este logro aún no está disponible" }, { status: 400 });
    }
    const eligible = await isEligibleForMilestone(userId, reward.milestoneKey);
    if (!eligible) {
      return Response.json({ error: "Aún no cumples este logro" }, { status: 400 });
    }
  }

  // Check balance
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (user.coins < reward.costCoins) {
    return Response.json({ error: "Monedas insuficientes" }, { status: 400 });
  }

  let remainingCoins: number;

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ coins: sql`${users.coins} - ${reward.costCoins}` })
      .where(eq(users.id, userId));

    try {
      await tx.insert(userRewards).values({ userId, rewardId });
    } catch {
      throw new Error("Ya tienes esta recompensa");
    }

    const [updated] = await tx.select({ coins: users.coins }).from(users).where(eq(users.id, userId));
    remainingCoins = updated.coins;
  });

  return Response.json({ success: true, remainingCoins: remainingCoins! }, { status: 201 });
}
