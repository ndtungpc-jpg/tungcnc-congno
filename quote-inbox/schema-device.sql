-- Additive staging migration: existing quote rows remain untouched.
CREATE TABLE IF NOT EXISTS inbox_devices(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,origin TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('sender','receiver')),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS inbox_rates(bucket TEXT PRIMARY KEY,n INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS inbox_claims(quote_id TEXT PRIMARY KEY,quote_key TEXT NOT NULL UNIQUE,device_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
