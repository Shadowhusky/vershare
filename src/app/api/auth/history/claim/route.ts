import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/user-auth";
import { getDb } from "@/lib/db";

interface ClaimItem {
  share_id: string;
}

// Attribute shares created anonymously (before login) to the now-logged-in
// user: sets shares.created_by where unowned and records upload history.
export async function POST(request: NextRequest) {
  const userEmail = getUserFromRequest(request);
  if (!userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { items?: ClaimItem[] };
  const ids = (body.items || [])
    .map((i) => i.share_id)
    .filter((id) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,21}$/.test(id))
    .slice(0, 50);

  if (ids.length === 0) {
    return NextResponse.json({ claimed: 0 });
  }

  const db = await getDb();
  let claimed = 0;
  for (const id of ids) {
    const share = await db
      .prepare("SELECT id, type, title, file_name, file_size, created_at, expires_at, created_by FROM shares WHERE id = ?")
      .bind(id)
      .first<{
        id: string;
        type: string;
        title: string | null;
        file_name: string | null;
        file_size: number | null;
        created_at: string;
        expires_at: string | null;
        created_by: string | null;
      }>();
    if (!share) continue;
    if (share.created_by && share.created_by !== userEmail) continue;

    if (!share.created_by) {
      await db
        .prepare("UPDATE shares SET created_by = ? WHERE id = ?")
        .bind(userEmail, id)
        .run();
    }
    await db
      .prepare(
        `INSERT OR REPLACE INTO upload_history (share_id, user_email, share_type, title, file_name, file_size, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        share.id,
        userEmail,
        share.type,
        share.title,
        share.file_name,
        share.file_size,
        share.created_at,
        share.expires_at
      )
      .run();
    claimed++;
  }

  return NextResponse.json({ claimed });
}
