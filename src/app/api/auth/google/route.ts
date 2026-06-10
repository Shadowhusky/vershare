import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleCredential } from "@/lib/google-auth";
import {
  upsertGoogleUser,
  createUserToken,
  getUserSessionCookieOptions,
} from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  const { credential } = (await request
    .json()
    .catch(() => ({ credential: "" }))) as { credential?: string };

  if (!credential) {
    return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
  }

  try {
    const profile = await verifyGoogleCredential(credential);
    await upsertGoogleUser(profile.email, profile.sub);

    const token = createUserToken(profile.email);
    const response = NextResponse.json({
      email: profile.email,
      emailVerified: true,
    });
    response.cookies.set(getUserSessionCookieOptions(token));
    return response;
  } catch (err) {
    console.error("Google sign-in failed:", err);
    return NextResponse.json({ error: "Google sign-in failed" }, { status: 401 });
  }
}
