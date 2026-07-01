import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userRewards, rewards } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);

  const myRewards = await db
    .select({
      id: userRewards.id,
      rewardId: userRewards.rewardId,
      redeemedAt: userRewards.redeemedAt,
      name: rewards.name,
      description: rewards.description,
      type: rewards.type,
      assetValue: rewards.assetValue,
      costCoins: rewards.costCoins,
    })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(eq(userRewards.userId, userId))
    .orderBy(desc(userRewards.redeemedAt));

  return Response.json({ rewards: myRewards });
}
