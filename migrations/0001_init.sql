CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  verify_code TEXT,
  last_code_sent_at TEXT,
  created_at TEXT NOT NULL,
  wizard_seen INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS upload_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id TEXT NOT NULL,
  user_email TEXT,
  share_type TEXT NOT NULL,
  title TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  UNIQUE(share_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_history_user ON upload_history(user_email);
CREATE INDEX IF NOT EXISTS idx_history_created ON upload_history(created_at);

CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT,
  language TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  content_size INTEGER,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_shares_created ON shares(created_at);
CREATE INDEX IF NOT EXISTS idx_shares_expires ON shares(expires_at);
