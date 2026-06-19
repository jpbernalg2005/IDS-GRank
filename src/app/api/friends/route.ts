import { auth } from "@/lib/auth";
import { db } from "@/db";
import { friendships, users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { username } = await req.json();

  const target = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!target) {
    return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (target.id === userId) {
    return Response.json({ error: "No puedes agregarte a ti mismo" }, { status: 400 });
  }

  const existing = await db.query.friendships.findFirst({
    where: or(
      and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, target.id)),
      and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, userId))
    ),
  });

  if (existing) {
    return Response.json({ error: "Ya existe una solicitud" }, { status: 400 });
  }

  await db.insert(friendships).values({
    requesterId: userId,
    addresseeId: target.id,
  });

  return Response.json({ success: true }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  const friendList = await db.query.friendships.findMany({
    where: or(
      and(eq(friendships.requesterId, userId), eq(friendships.status, "ACCEPTED")),
      and(eq(friendships.addresseeId, userId), eq(friendships.status, "ACCEPTED"))
    ),
    with: {
      requester: true,
      addressee: true,
    },
  });

  return Response.json(friendList);
}
