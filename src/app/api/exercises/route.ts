import { db } from "@/db";
import { exercises, exerciseCategories } from "@/db/schema";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const withCategories = searchParams.get("categories");

  if (withCategories) {
    const cats = await db.query.exerciseCategories.findMany();
    return Response.json(cats);
  }

  const all = await db.query.exercises.findMany();
  return Response.json(all);
}
