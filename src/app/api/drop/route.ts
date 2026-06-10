import { NextRequest, NextResponse } from "next/server";
import { createShare } from "@/lib/shares";
import { getBaseUrl } from "@/lib/url";

/**
 * POST /api/drop — Agent-friendly share endpoint.
 * Accepts same params as /api/shares but returns plain text URL (raw link).
 *
 * Usage:
 *   curl -X POST https://vershare.example/api/drop \
 *     -H 'Content-Type: application/json' \
 *     -d '{"type":"text","content":"hello"}'
 *   → https://vershare.example/api/shares/aBcDeFgHiJ/raw
 *
 * With ?format=json returns JSON with all links.
 * With ?format=view returns the web view URL instead.
 */
export async function POST(request: NextRequest) {
  try {
    const base = await getBaseUrl();
    const format = request.nextUrl.searchParams.get("format") || "raw";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const type = formData.get("type") as string;
      const title = formData.get("title") as string | null;

      if (!file || (type !== "file" && type !== "image")) {
        return new NextResponse("Error: provide type=file|image and file", { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const share = await createShare({
        type,
        title: title || undefined,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        buffer,
      });

      return respond(base, share.id, format);
    }

    // JSON body
    const body = await request.json() as Record<string, string | undefined>;
    const { type, title, content, language } = body;

    if (!content || typeof content !== "string") {
      return new NextResponse("Error: content is required", { status: 400 });
    }

    const validTypes = ["text", "markdown", "code"];
    const share = await createShare({
      type: (type && validTypes.includes(type) ? type : "text") as "text" | "markdown" | "code",
      title: title || undefined,
      content,
      language,
    });

    return respond(base, share.id, format);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return new NextResponse(`Error: ${msg}`, { status: 500 });
  }
}

function respond(base: string, id: string, format: string) {
  const raw = `${base}/api/shares/${id}/raw`;
  const view = `${base}/s/${id}`;
  const api = `${base}/api/shares/${id}`;

  if (format === "json") {
    return NextResponse.json({ id, url: view, raw, api });
  }

  if (format === "view") {
    return new NextResponse(view, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Default: return raw URL as plain text
  return new NextResponse(raw, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
