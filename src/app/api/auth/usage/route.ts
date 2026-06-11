import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/user-auth";
import { getUserStorageUsage } from "@/lib/storage";
import { STORAGE_QUOTA_BYTES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const used = await getUserStorageUsage(email);
  return NextResponse.json({ used, limit: STORAGE_QUOTA_BYTES });
}
