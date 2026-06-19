import { db } from "@/db";
import { exercises } from "@/db/schema";

export async function GET() {
  const all = await db.query.exercises.findMany();
  return Response.json(all);
}
