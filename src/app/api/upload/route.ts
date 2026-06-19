import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;

    if (!file) {
      return Response.json({ error: "No se envió archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${session.user.id}-${Date.now()}-${file.name}`;

    // In a real app, upload to S3/MinIO/Uploadthing
    // For now, return a placeholder
    return Response.json({
      success: true,
      url: `/uploads/${fileName}`,
      fileName,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}
