export type ShareType = "text" | "markdown" | "code" | "file" | "image";

export interface ShareMetadata {
  id: string;
  type: ShareType;
  title?: string;
  createdAt: string;
  expiresAt?: string | null; // ISO string, null = permanent
  createdBy?: string | null; // user email (server-side only)
  isOwner?: boolean; // computed per-request, safe for clients
  content?: string;
  contentSize?: number;
  language?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  filePath?: string;
}
