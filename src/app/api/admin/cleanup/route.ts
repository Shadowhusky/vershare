import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/admin-auth";
import { deleteShareData, readAllShares } from "@/lib/storage";
import { EXPIRED_RETENTION_MS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only purge shares whose post-expiry recovery window has passed
  const cutoff = Date.now() - EXPIRED_RETENTION_MS;
  let cleaned = 0;
  let freedBytes = 0;

  const shares = await readAllShares();
  for (const share of shares) {
    if (share.expiresAt && new Date(share.expiresAt).getTime() < cutoff) {
      const size = share.fileSize || share.contentSize || 0;
      if (await deleteShareData(share.id)) {
        cleaned++;
        freedBytes += size;
      }
    }
  }

  return NextResponse.json({ cleaned, freedBytes });
}
