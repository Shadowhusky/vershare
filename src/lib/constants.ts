export const SHARE_TYPES = ["text", "markdown", "code", "file", "image"] as const;

export const DEFAULT_EXPIRY_DAYS = 7;
export const DEFAULT_EXPIRY_MS = DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Expired shares stay recoverable for this long, then are purged for good
export const EXPIRED_RETENTION_DAYS = 30;
export const EXPIRED_RETENTION_MS = EXPIRED_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const MAX_TEXT_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

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
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
