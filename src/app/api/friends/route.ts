import { auth } from "@/lib/auth";
import { db } from "@/db";
import { friendships, users, rewards } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const { username } = await req.json();

  const target = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!target) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.id === userId) return Response.json({ error: "No puedes agregarte a ti mismo" }, { status: 400 });

  const existing = await db.query.friendships.findFirst({
    where: or(
      and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, target.id)),
      and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, userId))
    ),
  });

  if (existing) return Response.json({ error: "Ya existe una solicitud" }, { status: 400 });

  await db.insert(friendships).values({ requesterId: userId, addresseeId: target.id });
  return Response.json({ success: true }, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const { friendshipId, action } = await req.json();

  const friendship = await db.query.friendships.findFirst({ where: eq(friendships.id, friendshipId) });
  if (!friendship) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (friendship.addresseeId !== userId) return Response.json({ error: "No autorizado" }, { status: 403 });

  if (action === "accept") {
    await db.update(friendships).set({ status: "ACCEPTED", updatedAt: new Date() }).where(eq(friendships.id, friendshipId));
  } else {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  return Response.json({ success: true });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  if (search === "users") {
    const frameReward = alias(rewards, "frame_reward");
    const titleReward = alias(rewards, "title_reward");

    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        equippedFrameAsset: frameReward.assetValue,
        equippedTitleAsset: titleReward.assetValue,
      })
      .from(users)
      .leftJoin(frameReward, eq(users.equippedFrameRewardId, frameReward.id))
      .leftJoin(titleReward, eq(users.equippedTitleRewardId, titleReward.id));

    const friendRows = await db
      .select({
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
      })
      .from(friendships)
      .where(
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
      );

    const existingFriendIds = new Set<number>();
    for (const r of friendRows) {
      existingFriendIds.add(r.requesterId);
      existingFriendIds.add(r.addresseeId);
    }

    const available = allUsers.filter((u) => u.id !== userId && !existingFriendIds.has(u.id));
    return Response.json(available);
  }

  const withEquipped = {
    requester: { with: { equippedFrame: true, equippedTitle: true } },
    addressee: { with: { equippedFrame: true, equippedTitle: true } },
  } as const;

  const friendList = await db.query.friendships.findMany({
    where: or(
      and(eq(friendships.requesterId, userId), eq(friendships.status, "ACCEPTED")),
      and(eq(friendships.addresseeId, userId), eq(friendships.status, "ACCEPTED"))
    ),
    with: withEquipped,
  });

  const pendingRequests = await db.query.friendships.findMany({
    where: and(eq(friendships.addresseeId, userId), eq(friendships.status, "PENDING")),
    with: withEquipped,
  });

  return Response.json({ friends: friendList, pending: pendingRequests });
}
