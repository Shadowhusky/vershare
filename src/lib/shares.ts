import { nanoid } from "nanoid";
import { ShareMetadata } from "./types";
import {
  writeShareMetadata,
  readShareMetadata,
  saveUploadedFile,
} from "./storage";
import { MAX_TEXT_SIZE, MAX_FILE_SIZE, MAX_IMAGE_SIZE, DEFAULT_EXPIRY_MS, EXPIRED_RETENTION_MS } from "./constants";

interface CreateTextShareInput {
  type: "text" | "markdown" | "code";
  title?: string;
  content: string;
  language?: string;
  permanent?: boolean;
  createdBy?: string;
}

interface CreateFileShareInput {
  type: "file" | "image";
  title?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  data: ArrayBuffer | Uint8Array | Blob;
  permanent?: boolean;
  createdBy?: string;
}

export type CreateShareInput = CreateTextShareInput | CreateFileShareInput;

function computeExpiry(permanent?: boolean): string | null {
  if (permanent) return null;
  return new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString();
}

export async function createShare(
  input: CreateShareInput
): Promise<ShareMetadata> {
  const id = nanoid(10);
  const expiresAt = computeExpiry(input.permanent);
  const createdBy = input.createdBy || null;

  if (input.type === "text" || input.type === "markdown" || input.type === "code") {
    if (Buffer.byteLength(input.content, "utf-8") > MAX_TEXT_SIZE) {
      throw new Error("Content exceeds maximum size of 5MB");
    }

    const share: ShareMetadata = {
      id,
      type: input.type,
      title: input.title,
      content: input.content,
      language: input.type === "code" ? input.language || "plaintext" : undefined,
      createdAt: new Date().toISOString(),
      expiresAt,
      createdBy,
    };

    await writeShareMetadata(share);
    return share;
  }

  // File or image
  const fileInput = input as CreateFileShareInput;
  const maxSize = fileInput.type === "image" ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (fileInput.fileSize > maxSize) {
    throw new Error(
      `File exceeds maximum size of ${maxSize / (1024 * 1024)}MB`
    );
  }

  const filePath = await saveUploadedFile(id, fileInput.fileName, fileInput.data);

  const share: ShareMetadata = {
    id,
    type: fileInput.type,
    title: fileInput.title,
    fileName: fileInput.fileName,
    fileSize: fileInput.fileSize,
    mimeType: fileInput.mimeType,
    filePath,
    createdAt: new Date().toISOString(),
    expiresAt,
    createdBy,
  };

  await writeShareMetadata(share);
  return share;
}

export async function getShare(id: string): Promise<ShareMetadata | null> {
  return readShareMetadata(id);
}

export interface ShareCheck {
  share: ShareMetadata | null;
  expired: boolean;
  /** past the recovery window — treat as permanently deleted */
  gone: boolean;
}

export async function getShareChecked(id: string): Promise<ShareCheck> {
  const share = await readShareMetadata(id);
  if (!share) return { share: null, expired: false, gone: false };
  if (share.expiresAt) {
    const expiresMs = new Date(share.expiresAt).getTime();
    if (expiresMs + EXPIRED_RETENTION_MS < Date.now()) {
      return { share, expired: true, gone: true };
    }
    if (expiresMs < Date.now()) {
      return { share, expired: true, gone: false };
    }
  }
  return { share, expired: false, gone: false };
}
