import { db } from "@/db";
import { users } from "@/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { username, email, password, sex, weightKg } = await req.json();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return Response.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUsername) {
      return Response.json({ error: "El usuario ya existe" }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    await db.insert(users).values({
      username,
      email,
      passwordHash,
      sex,
      weightKg: weightKg ? String(weightKg) : null,
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
