import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, verifyUserEmail } from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code } = await request.json().catch(() => ({ code: "" })) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "Verification code required" }, { status: 400 });
  }

  const ok = await verifyUserEmail(email, code);
  if (!ok) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  return NextResponse.json({ verified: true });
}
