import { auth } from "@/lib/auth";
import { db } from "@/db";
import { personalRecords } from "@/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { exerciseId, weightKg, reps, date, videoUrl, notes } = await req.json();

  await db.insert(personalRecords).values({
    userId,
    exerciseId: Number(exerciseId),
    weightKg: String(weightKg),
    reps: Number(reps),
    date: date ? new Date(date) : new Date(),
    videoUrl,
    notes,
  });

  return Response.json({ success: true }, { status: 201 });
}
