import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getUserUploadHistory } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const history = await getUserUploadHistory(email);
  return NextResponse.json({ history });
}
