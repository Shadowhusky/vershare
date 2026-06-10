import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "vershare_admin_session";
const TOKEN_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

function getSecret(): string {
  return process.env.ADMIN_SECRET || "fallback-secret-not-for-production";
}

export function createToken(username: string): string {
  const payload = {
    sub: username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(payloadB64)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  const validUser = process.env.ADMIN_USER;
  const validPass = process.env.ADMIN_PASS;
  if (!validUser || !validPass) return false;
  return username === validUser && password === validPass;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token) !== null;
}

export function getSessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  };
}

export function getClearCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export { COOKIE_NAME };
