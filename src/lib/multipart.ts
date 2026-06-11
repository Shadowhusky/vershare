import { nanoid } from "nanoid";
import { getDb, getFilesBucket } from "./db";
import { writeShareMetadata } from "./storage";
import { addUploadHistory } from "./user-auth";
import { ShareMetadata } from "./types";
import { DEFAULT_EXPIRY_MS } from "./constants";

export interface PendingUpload {
  id: string;
  user_email: string;
  r2_key: string;
  upload_id: string;
  type: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

export interface UploadedPartRef {
  partNumber: number;
  etag: string;
}

function sanitizeFileName(fileName: string): string {
  return fileName.split("/").pop()!.split("\\").pop()!;
}

export async function initMultipartUpload(input: {
  userEmail: string;
  type: "file" | "image";
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<{ id: string }> {
  const id = nanoid(10);
  const fileName = sanitizeFileName(input.fileName);
  const key = `uploads/${id}/${fileName}`;

  const bucket = await getFilesBucket();
  const mp = await bucket.createMultipartUpload(key, {
    httpMetadata: { contentType: input.mimeType || "application/octet-stream" },
  });

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO pending_uploads (id, user_email, r2_key, upload_id, type, file_name, file_size, mime_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userEmail,
      key,
      mp.uploadId,
      input.type,
      fileName,
      input.fileSize,
      input.mimeType || null,
      new Date().toISOString()
    )
    .run();

  return { id };
}

export async function getPendingUpload(
  id: string,
  userEmail: string
): Promise<PendingUpload | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT * FROM pending_uploads WHERE id = ? AND user_email = ?")
    .bind(id, userEmail)
    .first<PendingUpload>();
  return row ?? null;
}

export async function uploadPart(
  pending: PendingUpload,
  partNumber: number,
  body: ArrayBuffer
): Promise<UploadedPartRef> {
  const bucket = await getFilesBucket();
  const mp = bucket.resumeMultipartUpload(pending.r2_key, pending.upload_id);
  const part = await mp.uploadPart(partNumber, body);
  return { partNumber: part.partNumber, etag: part.etag };
}

export async function completeMultipartUpload(
  pending: PendingUpload,
  parts: UploadedPartRef[],
  options: { title?: string; permanent?: boolean }
): Promise<ShareMetadata> {
  const bucket = await getFilesBucket();
  const mp = bucket.resumeMultipartUpload(pending.r2_key, pending.upload_id);
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const obj = await mp.complete(sorted);

  if (obj.size !== pending.file_size) {
    await bucket.delete(pending.r2_key);
    await removePendingRow(pending.id);
    throw new Error(
      `Upload incomplete: got ${obj.size} bytes, expected ${pending.file_size}`
    );
  }

  const share: ShareMetadata = {
    id: pending.id,
    type: pending.type as ShareMetadata["type"],
    title: options.title,
    fileName: pending.file_name,
    fileSize: pending.file_size,
    mimeType: pending.mime_type ?? undefined,
    filePath: `${pending.id}/${pending.file_name}`,
    createdAt: new Date().toISOString(),
    expiresAt: options.permanent
      ? null
      : new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString(),
    createdBy: pending.user_email,
  };
  await writeShareMetadata(share);
  await addUploadHistory(
    share.id,
    pending.user_email,
    share.type,
    share.title || null,
    share.fileName || null,
    share.fileSize || null,
    share.expiresAt || null
  );
  await removePendingRow(pending.id);
  return share;
}

export async function abortMultipartUpload(pending: PendingUpload): Promise<void> {
  const bucket = await getFilesBucket();
  try {
    await bucket.resumeMultipartUpload(pending.r2_key, pending.upload_id).abort();
  } catch {
    // already aborted/completed on the R2 side — still drop the row
  }
  await removePendingRow(pending.id);
}

async function removePendingRow(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM pending_uploads WHERE id = ?").bind(id).run();
}
