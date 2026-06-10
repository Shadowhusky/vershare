import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export interface GoogleProfile {
  email: string;
  sub: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleCredential(
  credential: string
): Promise<GoogleProfile> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google sign-in is not configured");

  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  if (!payload.email || payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }

  return {
    email: String(payload.email).toLowerCase(),
    sub: String(payload.sub),
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
