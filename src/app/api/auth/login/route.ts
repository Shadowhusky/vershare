import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, getUserSessionCookieOptions } from "@/lib/user-auth";
import { getPostHogClient, flushPostHog } from "@/lib/posthog-server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({ email: "", password: "" })) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const token = await authenticateUser(email, password);
  if (!token) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const posthog = getPostHogClient();
  posthog.capture({ distinctId: email.toLowerCase(), event: "user_logged_in", properties: { source: "email" } });
  flushPostHog();

  const response = NextResponse.json({ email: email.toLowerCase() });
  response.cookies.set(getUserSessionCookieOptions(token));
  return response;
}
