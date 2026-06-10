import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, regenerateVerifyCode, RESEND_COOLDOWN_SECONDS } from "@/lib/user-auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code, waitSeconds } = await regenerateVerifyCode(email);

  if (waitSeconds > 0) {
    return NextResponse.json(
      { error: `Please wait ${waitSeconds}s before resending`, waitSeconds, cooldown: RESEND_COOLDOWN_SECONDS },
      { status: 429 }
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Already verified or user not found" }, { status: 400 });
  }

  const emailSent = await sendVerificationEmail(email, code);

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({
    sent: true,
    emailSent,
    cooldown: RESEND_COOLDOWN_SECONDS,
    ...(isDev || !emailSent ? { verifyCode: code } : {}),
  });
}
