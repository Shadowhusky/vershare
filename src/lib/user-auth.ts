import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { getDb } from "./db";

const USER_COOKIE_NAME = "vershare_user_session";
const USER_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const RESEND_COOLDOWN_SECONDS = 60;

function getSecret(): string {
  return process.env.ADMIN_SECRET || "fallback-secret-not-for-production";
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function createUserToken(email: string): string {
  const payload = {
    sub: email.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + USER_TOKEN_MAX_AGE,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret() + "-user")
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyUserToken(token: string): { sub: string } | null {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", getSecret() + "-user")
      .update(payloadB64)
      .digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ email: string; verifyCode: string }> {
  const emailLower = email.toLowerCase();
  const db = await getDb();
  const existing = await db
    .prepare("SELECT email FROM users WHERE email = ?")
    .bind(emailLower)
    .first();
  if (existing) throw new Error("User already exists");

  const salt = crypto.randomBytes(32).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const verifyCode = crypto.randomInt(100000, 999999).toString();

  await db
    .prepare(
      "INSERT INTO users (email, password_hash, salt, email_verified, verify_code, created_at) VALUES (?, ?, ?, 0, ?, ?)"
    )
    .bind(emailLower, passwordHash, salt, verifyCode, new Date().toISOString())
    .run();

  return { email: emailLower, verifyCode };
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<string | null> {
  const emailLower = email.toLowerCase();
  const db = await getDb();
  const row = await db
    .prepare("SELECT password_hash, salt FROM users WHERE email = ?")
    .bind(emailLower)
    .first<{ password_hash: string; salt: string }>();
  if (!row) return null;
  const hash = hashPassword(password, row.salt);
  if (hash !== row.password_hash) return null;
  return createUserToken(emailLower);
}

export function getUserFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get(USER_COOKIE_NAME)?.value;
  if (!token) return null;
  const result = verifyUserToken(token);
  return result?.sub || null;
}

export async function getUserFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;
  if (!token) return null;
  const result = verifyUserToken(token);
  return result?.sub || null;
}

export interface SessionSnapshot {
  email: string | null;
  verified: boolean;
  wizardSeen: boolean;
}

const ANON_SESSION: SessionSnapshot = { email: null, verified: false, wizardSeen: false };

// Resolved server-side at render time so the first paint already shows the
// signed-in UI — no client /api/auth/me round-trip, no avatar/email pop-in.
export async function getSessionSnapshot(): Promise<SessionSnapshot> {
  try {
    const email = await getUserFromCookies();
    if (!email) return ANON_SESSION;
    const db = await getDb();
    const row = await db
      .prepare("SELECT email_verified, wizard_seen FROM users WHERE email = ?")
      .bind(email)
      .first<{ email_verified: number; wizard_seen: number }>();
    if (!row) return ANON_SESSION;
    return { email, verified: row.email_verified === 1, wizardSeen: row.wizard_seen === 1 };
  } catch {
    return ANON_SESSION;
  }
}

export async function isUserVerified(email: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT email_verified FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ email_verified: number }>();
  return row?.email_verified === 1;
}

export async function verifyUserEmail(email: string, code: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT verify_code FROM users WHERE email = ? AND email_verified = 0")
    .bind(email.toLowerCase())
    .first<{ verify_code: string }>();
  if (!row || row.verify_code !== code) return false;
  await db
    .prepare("UPDATE users SET email_verified = 1, verify_code = NULL WHERE email = ?")
    .bind(email.toLowerCase())
    .run();
  return true;
}

export async function getUserVerifyCode(email: string): Promise<string | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT verify_code FROM users WHERE email = ? AND email_verified = 0")
    .bind(email.toLowerCase())
    .first<{ verify_code: string | null }>();
  return row?.verify_code || null;
}

export async function regenerateVerifyCode(
  email: string
): Promise<{ code: string | null; waitSeconds: number }> {
  const emailLower = email.toLowerCase();
  const db = await getDb();
  const row = await db
    .prepare("SELECT email_verified, last_code_sent_at FROM users WHERE email = ?")
    .bind(emailLower)
    .first<{ email_verified: number; last_code_sent_at: string | null }>();
  if (!row || row.email_verified === 1) return { code: null, waitSeconds: 0 };

  if (row.last_code_sent_at) {
    const elapsed = (Date.now() - new Date(row.last_code_sent_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { code: null, waitSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) };
    }
  }

  const newCode = crypto.randomInt(100000, 999999).toString();
  await db
    .prepare("UPDATE users SET verify_code = ?, last_code_sent_at = ? WHERE email = ?")
    .bind(newCode, new Date().toISOString(), emailLower)
    .run();
  return { code: newCode, waitSeconds: 0 };
}

export function getUserSessionCookieOptions(token: string) {
  return {
    name: USER_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: USER_TOKEN_MAX_AGE,
  };
}

export function getClearUserCookieOptions() {
  return {
    name: USER_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

// SSO users have no password; empty hash/salt can never match a pbkdf2 digest
export async function upsertGoogleUser(
  email: string,
  googleSub: string
): Promise<void> {
  const emailLower = email.toLowerCase();
  const db = await getDb();
  const existing = await db
    .prepare("SELECT email FROM users WHERE email = ?")
    .bind(emailLower)
    .first();
  if (existing) {
    await db
      .prepare(
        "UPDATE users SET email_verified = 1, verify_code = NULL, google_sub = ? WHERE email = ?"
      )
      .bind(googleSub, emailLower)
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO users (email, password_hash, salt, email_verified, google_sub, created_at) VALUES (?, '', '', 1, ?, ?)"
      )
      .bind(emailLower, googleSub, new Date().toISOString())
      .run();
  }
}

// Upload history helpers
export async function addUploadHistory(
  shareId: string,
  userEmail: string | null,
  shareType: string,
  title: string | null,
  fileName: string | null,
  fileSize: number | null,
  expiresAt: string | null
): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `INSERT OR REPLACE INTO upload_history (share_id, user_email, share_type, title, file_name, file_size, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      shareId,
      userEmail,
      shareType,
      title,
      fileName,
      fileSize,
      new Date().toISOString(),
      expiresAt
    )
    .run();
}

export async function getUserUploadHistory(userEmail: string, limit = 50) {
  const db = await getDb();
  const { results } = await db
    .prepare(
      "SELECT share_id, share_type, title, file_name, file_size, created_at, expires_at FROM upload_history WHERE user_email = ? ORDER BY created_at DESC LIMIT ?"
    )
    .bind(userEmail, limit)
    .all();
  return results;
}

export async function hasSeenWizard(email: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT wizard_seen FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ wizard_seen: number }>();
  return row?.wizard_seen === 1;
}

export async function markWizardSeen(email: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE users SET wizard_seen = 1 WHERE email = ?")
    .bind(email.toLowerCase())
    .run();
}

export { USER_COOKIE_NAME };
