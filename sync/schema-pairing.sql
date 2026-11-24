-- Additive authorization metadata only. Never recreate or migrate business tables.
CREATE TABLE IF NOT EXISTS sync_pair_codes(code_hash TEXT PRIMARY KEY,creator TEXT NOT NULL,expires_at INTEGER NOT NULL,used_by TEXT,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sync_device_presence(device_id TEXT PRIMARY KEY,last_sync INTEGER NOT NULL);
