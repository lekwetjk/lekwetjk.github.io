CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER,
  sha256 TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  trashed_at TEXT
);
