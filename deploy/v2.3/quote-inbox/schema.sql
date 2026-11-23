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

-- Additive staging migration: existing quote rows remain untouched.
CREATE TABLE IF NOT EXISTS inbox_devices(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,origin TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('sender','receiver')),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS inbox_rates(bucket TEXT PRIMARY KEY,n INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS inbox_claims(quote_id TEXT PRIMARY KEY,quote_key TEXT NOT NULL UNIQUE,device_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
