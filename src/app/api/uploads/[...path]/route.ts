import { open, stat } from "fs/promises";
import { join } from "path";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = join(process.cwd(), "public", "uploads", ...path);

  try {
    const { size } = await stat(filePath);
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME[ext] ?? "application/octet-stream";

    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (!match) return new Response("Invalid range", { status: 416 });

      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : size - 1;
      const chunkSize = end - start + 1;

      const fd = await open(filePath, "r");
      const buf = Buffer.allocUnsafe(chunkSize);
      await fd.read(buf, 0, chunkSize, start);
      await fd.close();

      return new Response(buf, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    const fd = await open(filePath, "r");
    const buf = Buffer.allocUnsafe(size);
    await fd.read(buf, 0, size, 0);
    await fd.close();

    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(size),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
