import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createToken,
  getSessionCookieOptions,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string | undefined>;
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    if (!verifyCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = createToken(username);
    const cookieOpts = getSessionCookieOptions(token);

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieOpts);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
