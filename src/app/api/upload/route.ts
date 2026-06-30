import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;
    if (!file) return Response.json({ error: "No se envió archivo" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const fileName = `${session.user.id}-${Date.now()}-${safeName}`;
    const uploadDir = join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), buffer);

    return Response.json({ success: true, url: `/api/uploads/${fileName}`, fileName });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}
