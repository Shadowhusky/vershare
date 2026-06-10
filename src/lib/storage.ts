import { ShareMetadata } from "./types";
import { getDb, getFilesBucket } from "./db";

const TEXT_TYPES = new Set(["text", "markdown", "code"]);

export function uploadKey(relativePath: string): string {
  return `uploads/${relativePath}`;
}

function contentKey(id: string): string {
  return `content/${id}`;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

interface ShareRow {
  id: string;
  type: string;
  title: string | null;
  language: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  content_size: number | null;
  created_at: string;
  expires_at: string | null;
  created_by: string | null;
}

export function rowToShare(row: ShareRow): ShareMetadata {
  return {
    id: row.id,
    type: row.type as ShareMetadata["type"],
    title: row.title ?? undefined,
    language: row.language ?? undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ?? undefined,
    mimeType: row.mime_type ?? undefined,
    contentSize: row.content_size ?? undefined,
    filePath: row.file_name ? `${row.id}/${row.file_name}` : undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
  };
}

export async function writeShareMetadata(share: ShareMetadata) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT OR REPLACE INTO shares (id, type, title, language, file_name, file_size, mime_type, content_size, created_at, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      share.id,
      share.type,
      share.title ?? null,
      share.language ?? null,
      share.fileName ?? null,
      share.fileSize ?? null,
      share.mimeType ?? null,
      share.content ? new TextEncoder().encode(share.content).byteLength : null,
      share.createdAt,
      share.expiresAt ?? null,
      share.createdBy ?? null
    )
    .run();

  if (share.content !== undefined) {
    const bucket = await getFilesBucket();
    await bucket.put(contentKey(share.id), share.content);
  }
}

export async function readShareMetadata(
  id: string
): Promise<ShareMetadata | null> {
  const safeId = sanitizeId(id);
  const db = await getDb();
  const row = await db
    .prepare("SELECT * FROM shares WHERE id = ?")
    .bind(safeId)
    .first<ShareRow>();
  if (!row) return null;

  const share = rowToShare(row);
  if (TEXT_TYPES.has(share.type)) {
    const bucket = await getFilesBucket();
    const obj = await bucket.get(contentKey(safeId));
    share.content = obj ? await obj.text() : "";
  }
  return share;
}

export async function saveUploadedFile(
  id: string,
  fileName: string,
  data: ArrayBuffer | Uint8Array
): Promise<string> {
  const safeId = sanitizeId(id);
  const safeFileName = fileName.split("/").pop()!.split("\\").pop()!;
  const relativePath = `${safeId}/${safeFileName}`;
  const bucket = await getFilesBucket();
  await bucket.put(uploadKey(relativePath), data);
  return relativePath;
}

export async function getUploadObject(
  relativePath: string,
  range?: { offset: number; length: number }
): Promise<R2ObjectBody | null> {
  const bucket = await getFilesBucket();
  return bucket.get(uploadKey(relativePath), range ? { range } : undefined);
}

export async function deleteShareData(id: string): Promise<boolean> {
  const safeId = sanitizeId(id);
  try {
    const db = await getDb();
    const bucket = await getFilesBucket();
    await bucket.delete(contentKey(safeId));
    const uploads = await bucket.list({ prefix: `uploads/${safeId}/` });
    if (uploads.objects.length > 0) {
      await bucket.delete(uploads.objects.map((o) => o.key));
    }
    await db.prepare("DELETE FROM shares WHERE id = ?").bind(safeId).run();
    return true;
  } catch {
    return false;
  }
}

export async function listShares(
  limit = 20,
  offset = 0
): Promise<ShareMetadata[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM shares ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .bind(limit, offset)
    .all<ShareRow>();
  return results.map(rowToShare);
}

export async function readAllShares(): Promise<ShareMetadata[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM shares ORDER BY created_at DESC")
    .all<ShareRow>();
  return results.map(rowToShare);
}
