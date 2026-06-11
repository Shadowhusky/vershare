-- Multipart uploads in flight: one row per init, removed on complete/abort.
-- The cron aborts and purges rows older than 24h so R2 doesn't accumulate
-- abandoned multipart parts (they bill until aborted).
CREATE TABLE IF NOT EXISTS pending_uploads (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_uploads_created ON pending_uploads(created_at);
