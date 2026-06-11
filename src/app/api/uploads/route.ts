import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/user-auth";
import { getUserStorageUsage } from "@/lib/storage";
import { initMultipartUpload } from "@/lib/multipart";
import {
  MAX_IMAGE_SIZE,
  MAX_UPLOAD_FILE_SIZE,
  STORAGE_QUOTA_BYTES,
  UPLOAD_PART_SIZE,
} from "@/lib/constants";

// Init a chunked upload. Single requests cap at ~100MB on Workers, so large
// files stream up in parts; the account requirement is what ties them to quota.
export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserFromRequest(request);
    if (!userEmail) {
      return NextResponse.json(
        { error: "Sign in to upload large files", code: "auth_required" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      type?: string;
    };
    const { fileName, fileSize, mimeType } = body;
    const type = body.type === "image" ? "image" : "file";

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }
    if (!Number.isInteger(fileSize) || fileSize! <= 0) {
      return NextResponse.json({ error: "fileSize is required" }, { status: 400 });
    }
    const maxSize = type === "image" ? MAX_IMAGE_SIZE : MAX_UPLOAD_FILE_SIZE;
    if (fileSize! > maxSize) {
      return NextResponse.json(
        { error: `File exceeds maximum size of ${maxSize / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    const used = await getUserStorageUsage(userEmail);
    if (used + fileSize! > STORAGE_QUOTA_BYTES) {
      return NextResponse.json(
        { error: "Storage quota exceeded", code: "quota_exceeded", used, limit: STORAGE_QUOTA_BYTES },
        { status: 413 }
      );
    }

    const { id } = await initMultipartUpload({
      userEmail,
      type,
      fileName,
      fileSize: fileSize!,
      mimeType: mimeType || "application/octet-stream",
    });

    return NextResponse.json({ id, partSize: UPLOAD_PART_SIZE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
