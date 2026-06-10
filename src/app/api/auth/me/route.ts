import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, isUserVerified, getUserVerifyCode, hasSeenWizard, markWizardSeen } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const emailVerified = await isUserVerified(email);
  const isDev = process.env.NODE_ENV !== "production";
  const verifyCode = !emailVerified && isDev ? await getUserVerifyCode(email) : null;

  const wizardSeen = await hasSeenWizard(email);
  return NextResponse.json({ email, emailVerified, wizardSeen, ...(verifyCode ? { verifyCode } : {}) });
}

export async function POST(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as { wizardSeen?: boolean };
  if (body.wizardSeen) {
    await markWizardSeen(email);
  }
  return NextResponse.json({ ok: true });
}
