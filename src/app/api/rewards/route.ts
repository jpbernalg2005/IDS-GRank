import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, rewards, userRewards } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

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
