import { auth } from "@/lib/auth";
import { db } from "@/db";
import { competitionGroups, groupMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateRandomCode } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const { name, description, isPrivate } = await req.json();

  const inviteCode = generateRandomCode(8);

  const [group] = await db.insert(competitionGroups)
    .values({ name, description, createdBy: userId, inviteCode, isPrivate })
    .returning();

  await db.insert(groupMembers).values({ groupId: group.id, userId, role: "ADMIN" });

  return Response.json(group, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const { inviteCode } = await req.json();

  const group = await db.query.competitionGroups.findFirst({
    where: eq(competitionGroups.inviteCode, inviteCode),
  });

  if (!group) return Response.json({ error: "Código inválido" }, { status: 404 });

  const existingMember = await db.query.groupMembers.findFirst({
    where: (gm, { and }) => and(eq(gm.groupId, group.id), eq(gm.userId, userId)),
  });

  if (existingMember) return Response.json({ error: "Ya eres miembro de este grupo" }, { status: 400 });

  await db.insert(groupMembers).values({ groupId: group.id, userId, role: "MEMBER" });

  return Response.json(group, { status: 200 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    with: { group: true },
  });

  return Response.json(memberships);
}
