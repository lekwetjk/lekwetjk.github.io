CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  label TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  captured_by TEXT NOT NULL
);
