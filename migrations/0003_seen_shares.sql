CREATE TABLE IF NOT EXISTS seen_shares (
  user_email TEXT NOT NULL,
  share_id TEXT NOT NULL,
  share_type TEXT NOT NULL,
  title TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  expires_at TEXT,
  PRIMARY KEY (user_email, share_id)
);

CREATE INDEX IF NOT EXISTS idx_seen_user ON seen_shares(user_email, opened_at);
