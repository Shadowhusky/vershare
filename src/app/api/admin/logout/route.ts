import { NextResponse } from "next/server";
import { getClearCookieOptions } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(getClearCookieOptions());
  return response;
}
