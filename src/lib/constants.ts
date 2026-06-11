export const SHARE_TYPES = ["text", "markdown", "code", "file", "image"] as const;

export const DEFAULT_EXPIRY_DAYS = 7;
export const DEFAULT_EXPIRY_MS = DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Expired shares stay recoverable for this long, then are purged for good
export const EXPIRED_RETENTION_DAYS = 30;
export const EXPIRED_RETENTION_MS = EXPIRED_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10MB
// Single-request (anonymous) cap. formData parsing buffers the body in Worker
// memory; 1102 errors start around ~80MB, so keep solid headroom.
export const MAX_FILE_SIZE = 64 * 1024 * 1024; // 64MB
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

// Per-account cap on active (non-expired) storage. Expired drops don't count.
export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10GB

// Files above MAX_FILE_SIZE upload in chunks through R2 multipart (signed-in
// only — quota needs an account). Parts must be uniform-sized except the last.
export const UPLOAD_PART_SIZE = 32 * 1024 * 1024; // 32MiB: under body cap, modest Worker memory
export const MAX_UPLOAD_FILE_SIZE = STORAGE_QUOTA_BYTES; // per-file ceiling for signed-in users

export const CODE_LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "html",
  "css",
  "sql",
  "bash",
  "json",
  "yaml",
  "xml",
  "markdown",
] as const;

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
