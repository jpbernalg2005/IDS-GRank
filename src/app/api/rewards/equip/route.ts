import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, rewards, userRewards } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const EQUIPPABLE_TYPES = ["AVATAR_FRAME", "TITLE"] as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const body = await req.json();
  const rewardId = Number(body?.rewardId);
  const action = body?.action;

  if (!rewardId || (action !== "equip" && action !== "unequip")) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const reward = await db.query.rewards.findFirst({ where: eq(rewards.id, rewardId) });
  if (!reward) return Response.json({ error: "Recompensa no encontrada" }, { status: 400 });

  if (!EQUIPPABLE_TYPES.includes(reward.type as (typeof EQUIPPABLE_TYPES)[number])) {
    return Response.json({ error: "Esta recompensa no se puede equipar" }, { status: 400 });
  }

  const owned = await db.query.userRewards.findFirst({
    where: and(eq(userRewards.userId, userId), eq(userRewards.rewardId, rewardId)),
  });
  if (!owned) return Response.json({ error: "No posees esta recompensa" }, { status: 400 });

  const value = action === "equip" ? rewardId : null;

  if (reward.type === "AVATAR_FRAME") {
    await db.update(users).set({ equippedFrameRewardId: value }).where(eq(users.id, userId));
  } else {
    await db.update(users).set({ equippedTitleRewardId: value }).where(eq(users.id, userId));
  }

  return Response.json({ success: true, rewardId, action });
}
