import { auth } from "@/lib/auth";
import { db } from "@/db";
import { competitionGroups, groupMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateRandomCode } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { name, description, isPrivate } = await req.json();

  const inviteCode = generateRandomCode(8);

  const [group] = await db.insert(competitionGroups)
    .values({
      name,
      description,
      createdBy: userId,
      inviteCode,
      isPrivate,
    })
    .returning();

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    role: "ADMIN",
  });

  return Response.json(group, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    with: {
      group: true,
    },
  });

  return Response.json(memberships);
}
