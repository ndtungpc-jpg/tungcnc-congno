-- Dedicated inbox storage; does not modify existing IndexedDB or accounting records.
CREATE TABLE IF NOT EXISTS quote_inbox (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','imported','dismissed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_quote_inbox_status_created ON quote_inbox(status,created_at DESC);
