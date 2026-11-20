CREATE TABLE IF NOT EXISTS content_trash (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  restored_at TEXT
);
