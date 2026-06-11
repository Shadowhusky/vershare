import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/user-auth";
import { getPendingUpload, uploadPart } from "@/lib/multipart";
import { UPLOAD_PART_SIZE } from "@/lib/constants";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = getUserFromRequest(request);
    if (!userEmail) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const pending = await getPendingUpload(id, userEmail);
    if (!pending) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    const n = parseInt(new URL(request.url).searchParams.get("n") || "0", 10);
    if (!Number.isInteger(n) || n < 1 || n > 10000) {
      return NextResponse.json({ error: "Invalid part number" }, { status: 400 });
    }

    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json({ error: "Empty part" }, { status: 400 });
    }
    if (body.byteLength > UPLOAD_PART_SIZE) {
      return NextResponse.json({ error: "Part too large" }, { status: 413 });
    }

    const part = await uploadPart(pending, n, body);
    return NextResponse.json(part);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
