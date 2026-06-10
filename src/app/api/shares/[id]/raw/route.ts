import { NextRequest, NextResponse } from "next/server";
import { getShareChecked } from "@/lib/shares";
import { getUploadObject } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { share, expired, gone } = await getShareChecked(id);

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }
  if (gone) {
    return NextResponse.json({ error: "Share has been permanently deleted" }, { status: 410 });
  }
  if (expired) {
    return NextResponse.json({ error: "Share has expired" }, { status: 410 });
  }

  // For text content types, return as text
  if (share.content !== undefined) {
    return new NextResponse(share.content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // For file/image, serve the binary from R2
  if (!share.filePath) {
    return NextResponse.json({ error: "No file associated" }, { status: 404 });
  }

  const mime = share.mimeType || "application/octet-stream";
  const inlineable =
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf" ||
    mime === "text/html";

  const baseHeaders: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
  };

  if (share.type === "file" && !inlineable) {
    baseHeaders["Content-Disposition"] = `attachment; filename="${share.fileName}"`;
  }

  // Handle range requests (required for mobile video/audio streaming)
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const fullSize = share.fileSize ?? 0;
      const start = parseInt(match[1]);
      const end = match[2] ? parseInt(match[2]) : fullSize - 1;
      const length = end - start + 1;

      const obj = await getUploadObject(share.filePath, { offset: start, length });
      if (!obj) {
        return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
      }

      return new NextResponse(obj.body as unknown as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${obj.size}`,
          "Content-Length": length.toString(),
        },
      });
    }
  }

  const obj = await getUploadObject(share.filePath);
  if (!obj) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  return new NextResponse(obj.body as unknown as ReadableStream, {
    headers: {
      ...baseHeaders,
      "Content-Length": obj.size.toString(),
    },
  });
}
