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

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const fileName = `${session.user.id}-${Date.now()}-${safeName}`;

    // Conditional hybrid storage: check if UploadThing token is configured
    if (!process.env.UPLOADTHING_TOKEN) {
      // Local development mode: use disk storage
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadDir = join(process.cwd(), "public", "uploads");

      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, fileName), buffer);

      return Response.json({ success: true, url: `/api/uploads/${fileName}`, fileName });
    } else {
      // Production mode: use UploadThing
      const { UTApi } = await import("uploadthing/server");
      const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

      const uploadResult = await utapi.uploadFiles(file);

      if (uploadResult.length === 0 || uploadResult[0].error) {
        return Response.json(
          { error: uploadResult[0]?.error || "Error al subir archivo a UploadThing" },
          { status: 500 }
        );
      }

      const result = uploadResult[0];
      return Response.json({
        success: true,
        url: result.data.ufsUrl,
        fileName: result.data.key,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}
