import { NextRequest, NextResponse } from "next/server";
import { registerUser, createUserToken, getUserSessionCookieOptions } from "@/lib/user-auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({ email: "", password: "" })) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  try {
    const { email: userEmail, verifyCode } = await registerUser(email, password);
    const token = createUserToken(userEmail);

    const emailSent = await sendVerificationEmail(userEmail, verifyCode);

    const isDev = process.env.NODE_ENV !== "production";
    const response = NextResponse.json({
      email: userEmail,
      emailVerified: false,
      emailSent,
      ...(isDev || !emailSent ? { verifyCode } : {}),
    });
    response.cookies.set(getUserSessionCookieOptions(token));
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
