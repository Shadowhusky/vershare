import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/user-auth";
import { getDb } from "@/lib/db";

// List shares this user opened but did not create
export async function GET(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT s.share_id, s.share_type, s.title, s.file_name, s.file_size, s.created_at, s.opened_at,
              sh.expires_at
       FROM seen_shares s
       JOIN shares sh ON sh.id = s.share_id
       WHERE s.user_email = ?
       ORDER BY s.opened_at DESC
       LIMIT 50`
    )
    .bind(email)
    .all();
  return NextResponse.json({ history: results });
}

// Record that the user opened someone else's share
export async function POST(request: NextRequest) {
  const email = getUserFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { shareId?: string };
  const id = body.shareId;
  if (!id || !/^[a-zA-Z0-9_-]{1,21}$/.test(id)) {
    return NextResponse.json({ error: "Invalid share id" }, { status: 400 });
  }

  const db = await getDb();
  const share = await db
    .prepare(
      "SELECT id, type, title, file_name, file_size, created_at, created_by FROM shares WHERE id = ?"
    )
    .bind(id)
    .first<{
      id: string;
      type: string;
      title: string | null;
      file_name: string | null;
      file_size: number | null;
      created_at: string;
      created_by: string | null;
    }>();

  // Only record shares that exist and aren't the user's own
  if (!share || share.created_by === email) {
    return NextResponse.json({ recorded: false });
  }

  await db
    .prepare(
      `INSERT INTO seen_shares (user_email, share_id, share_type, title, file_name, file_size, created_at, opened_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_email, share_id) DO UPDATE SET opened_at = excluded.opened_at`
    )
    .bind(email, share.id, share.type, share.title, share.file_name, share.file_size, share.created_at, new Date().toISOString())
    .run();

  return NextResponse.json({ recorded: true });
}
