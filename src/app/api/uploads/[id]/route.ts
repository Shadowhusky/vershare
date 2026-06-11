import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, isUserVerified } from "@/lib/user-auth";
import { getUserStorageUsage } from "@/lib/storage";
import {
  getPendingUpload,
  completeMultipartUpload,
  abortMultipartUpload,
  UploadedPartRef,
} from "@/lib/multipart";
import { STORAGE_QUOTA_BYTES } from "@/lib/constants";
import { getBaseUrl } from "@/lib/url";

// Complete: stitch the parts into the final object and create the share.
export async function POST(
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

    const body = (await request.json().catch(() => ({}))) as {
      parts?: UploadedPartRef[];
      title?: string;
      permanent?: boolean;
    };
    const parts = body.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ error: "parts are required" }, { status: 400 });
    }

    if (body.permanent && !(await isUserVerified(userEmail))) {
      return NextResponse.json(
        { error: "Email verification required for permanent shares" },
        { status: 403 }
      );
    }

    const used = await getUserStorageUsage(userEmail);
    if (used + pending.file_size > STORAGE_QUOTA_BYTES) {
      await abortMultipartUpload(pending);
      return NextResponse.json(
        { error: "Storage quota exceeded", code: "quota_exceeded", used, limit: STORAGE_QUOTA_BYTES },
        { status: 413 }
      );
    }

    const share = await completeMultipartUpload(pending, parts, {
      title: body.title || undefined,
      permanent: !!body.permanent,
    });

    const baseUrl = await getBaseUrl();
    return NextResponse.json({
      id: share.id,
      type: share.type,
      title: share.title || null,
      fileName: share.fileName,
      fileSize: share.fileSize,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt || null,
      url: `${baseUrl}/s/${share.id}`,
      raw: `${baseUrl}/api/shares/${share.id}/raw`,
      api: `${baseUrl}/api/shares/${share.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Abort: drop the in-flight parts so R2 doesn't keep billing for them.
export async function DELETE(
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

    await abortMultipartUpload(pending);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
