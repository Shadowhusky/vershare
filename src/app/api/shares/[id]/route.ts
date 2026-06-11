import { NextRequest, NextResponse } from "next/server";
import { getShareChecked, getShare } from "@/lib/shares";
import { getBaseUrl } from "@/lib/url";
import { getDb } from "@/lib/db";
import { deleteShareData } from "@/lib/storage";
import { getUserFromRequest, isUserVerified } from "@/lib/user-auth";
import { DEFAULT_EXPIRY_MS, EXPIRED_RETENTION_MS } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { share, expired, gone } = await getShareChecked(id);

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const userEmail = getUserFromRequest(request);
  const isOwner = !!userEmail && !!share.createdBy && share.createdBy === userEmail;

  if (gone) {
    return NextResponse.json({ error: "Share has been permanently deleted", gone: true }, { status: 410 });
  }
  if (expired) {
    return NextResponse.json(
      { error: "Share has expired", isOwner, expiresAt: share.expiresAt },
      { status: 410 }
    );
  }

  const baseUrl = await getBaseUrl();
  const { createdBy: _createdBy, ...publicShare } = share;

  return NextResponse.json({
    ...publicShare,
    isOwner,
    url: `${baseUrl}/s/${share.id}`,
    raw: `${baseUrl}/api/shares/${share.id}/raw`,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userEmail = getUserFromRequest(request);
  if (!userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const share = await getShare(id);
  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }
  if (
    share.expiresAt &&
    new Date(share.expiresAt).getTime() + EXPIRED_RETENTION_MS < Date.now()
  ) {
    return NextResponse.json(
      { error: "Share has been permanently deleted and cannot be recovered" },
      { status: 410 }
    );
  }
  if (share.createdBy !== userEmail) {
    return NextResponse.json({ error: "Only the owner can change expiry" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { expiry?: string };
  let expiresAt: string | null;
  if (body.expiry === "permanent") {
    if (!(await isUserVerified(userEmail))) {
      return NextResponse.json(
        { error: "Email verification required for permanent shares" },
        { status: 403 }
      );
    }
    expiresAt = null;
  } else if (body.expiry === "extend") {
    // Add 7 days to the remaining time; expired shares restart from now
    const base = share.expiresAt
      ? Math.max(Date.now(), new Date(share.expiresAt).getTime())
      : Date.now();
    expiresAt = new Date(base + DEFAULT_EXPIRY_MS).toISOString();
  } else if (body.expiry === "temporary") {
    expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString();
  } else {
    return NextResponse.json({ error: "expiry must be \"extend\", \"permanent\" or \"temporary\"" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .prepare("UPDATE shares SET expires_at = ? WHERE id = ?")
    .bind(expiresAt, share.id)
    .run();
  await db
    .prepare("UPDATE upload_history SET expires_at = ? WHERE share_id = ?")
    .bind(expiresAt, share.id)
    .run();

  return NextResponse.json({ id: share.id, expiresAt });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userEmail = getUserFromRequest(request);
  if (!userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const share = await getShare(id);
  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }
  if (share.createdBy !== userEmail) {
    return NextResponse.json({ error: "Only the owner can delete this drop" }, { status: 403 });
  }

  await deleteShareData(share.id);
  return NextResponse.json({ deleted: true });
}
