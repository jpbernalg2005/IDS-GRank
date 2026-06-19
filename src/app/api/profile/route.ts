import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { displayName, bio, sex, weightKg, heightCm, experienceLevel } = await req.json();

  await db.update(users)
    .set({
      displayName,
      bio,
      sex,
      weightKg: weightKg || null,
      heightCm: heightCm || null,
      experienceLevel,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return Response.json({ success: true });
}
