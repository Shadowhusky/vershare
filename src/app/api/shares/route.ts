import { NextRequest, NextResponse } from "next/server";
import { createShare } from "@/lib/shares";
import { listShares, getUserStorageUsage } from "@/lib/storage";
import { ShareType } from "@/lib/types";
import { SHARE_TYPES, STORAGE_QUOTA_BYTES } from "@/lib/constants";
import { getBaseUrl } from "@/lib/url";
import { getUserFromRequest, isUserVerified, addUploadHistory } from "@/lib/user-auth";
import { inferMimeType } from "@/lib/mime";
import { getPostHogClient, flushPostHog } from "@/lib/posthog-server";


export async function GET(request: NextRequest) {
  try {
    const baseUrl = await getBaseUrl();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    const shares = await listShares(limit, offset);

    return NextResponse.json({
      shares: shares.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title || null,
        createdAt: s.createdAt,
        url: `${baseUrl}/s/${s.id}`,
        raw: `${baseUrl}/api/shares/${s.id}/raw`,
        ...(s.fileName ? { fileName: s.fileName, fileSize: s.fileSize } : {}),
      })),
      count: shares.length,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const baseUrl = await getBaseUrl();
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const type = formData.get("type") as string;
      const title = formData.get("title") as string | null;
      const permanentStr = formData.get("permanent") as string | null;
      const wantsPermanent = permanentStr === "true";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (type !== "file" && type !== "image") {
        return NextResponse.json({ error: "Invalid type for file upload" }, { status: 400 });
      }

      const userEmail = getUserFromRequest(request);
      if (wantsPermanent && !userEmail) {
        return NextResponse.json({ error: "Login required for permanent shares" }, { status: 401 });
      }
      if (wantsPermanent && userEmail && !(await isUserVerified(userEmail))) {
        return NextResponse.json({ error: "Email verification required for permanent shares" }, { status: 403 });
      }

      if (userEmail) {
        const used = await getUserStorageUsage(userEmail);
        if (used + file.size > STORAGE_QUOTA_BYTES) {
          return NextResponse.json(
            { error: "Storage quota exceeded", code: "quota_exceeded", used, limit: STORAGE_QUOTA_BYTES },
            { status: 413 }
          );
        }
      }

      const share = await createShare({
        type,
        title: title || undefined,
        fileName: file.name,
        fileSize: file.size,
        mimeType: inferMimeType(file.name, file.type),
        data: file,
        permanent: wantsPermanent,
        createdBy: userEmail || undefined,
      });

      // Record history for logged-in users
      if (userEmail) {
        await addUploadHistory(share.id, userEmail, share.type, share.title || null, share.fileName || null, share.fileSize || null, share.expiresAt || null);
      }

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userEmail || "anonymous",
        event: "share_created",
        properties: {
          share_id: share.id,
          share_type: share.type,
          is_permanent: share.expiresAt === null,
          has_title: !!share.title,
          is_authenticated: !!userEmail,
          file_size: share.fileSize,
          mime_type: share.mimeType,
          source: "api_file",
        },
      });
      flushPostHog();

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
    }

    // JSON body for text/markdown/code
    const body = await request.json() as Record<string, string | undefined>;
    const { type, title, content, language, permanent: wantsPerm } = body;

    if (!SHARE_TYPES.includes(type as ShareType)) {
      return NextResponse.json({ error: "Invalid share type" }, { status: 400 });
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const userEmail = getUserFromRequest(request);
    if (wantsPerm && !userEmail) {
      return NextResponse.json({ error: "Login required for permanent shares" }, { status: 401 });
    }
    if (wantsPerm && userEmail && !(await isUserVerified(userEmail))) {
      return NextResponse.json({ error: "Email verification required for permanent shares" }, { status: 403 });
    }

    const share = await createShare({
      type: type as "text" | "markdown" | "code",
      title: title || undefined,
      content,
      language,
      permanent: !!wantsPerm,
      createdBy: userEmail || undefined,
    });

    // Record history for logged-in users
    if (userEmail) {
      await addUploadHistory(share.id, userEmail, share.type, share.title || null, null, null, share.expiresAt || null);
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userEmail || "anonymous",
      event: "share_created",
      properties: {
        share_id: share.id,
        share_type: share.type,
        is_permanent: share.expiresAt === null,
        has_title: !!share.title,
        is_authenticated: !!userEmail,
        source: "api_text",
      },
    });
    flushPostHog();

    return NextResponse.json({
      id: share.id,
      type: share.type,
      title: share.title || null,
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
