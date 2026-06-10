import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/admin-auth";
import { deleteShareData, readAllShares } from "@/lib/storage";

function authCheck(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || !verifyToken(token)) return false;
  return true;
}

export async function GET(request: NextRequest) {
  if (!authCheck(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const typeFilter = url.searchParams.get("type") || "all";

  let shares = await readAllShares();

  if (typeFilter !== "all") {
    shares = shares.filter((s) => s.type === typeFilter);
  }

  shares.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = shares.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const pageShares = shares.slice(offset, offset + limit);

  return NextResponse.json({
    shares: pageShares,
    total,
    page,
    limit,
    totalPages,
  });
}

export async function DELETE(request: NextRequest) {
  if (!authCheck(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ids: string[] | undefined;
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text);
      ids = body.ids;
    }
  } catch {
    // no body or invalid JSON — treat as delete all
  }

  let toDelete: string[];

  if (ids && ids.length > 0) {
    toDelete = ids;
  } else {
    // Delete all
    const shares = await readAllShares();
    toDelete = shares.map((s) => s.id);
  }

  let deleted = 0;
  for (const id of toDelete) {
    if (await deleteShareData(id)) deleted++;
  }

  return NextResponse.json({ deleted });
}
