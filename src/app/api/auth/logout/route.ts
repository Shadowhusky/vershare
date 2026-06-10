import { NextResponse } from "next/server";
import { getClearUserCookieOptions } from "@/lib/user-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getClearUserCookieOptions());
  return response;
}
