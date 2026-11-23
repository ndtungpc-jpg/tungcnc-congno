-- Install only on the newly isolated legacy acceptance D1, never on existing staging/prod.
CREATE TABLE IF NOT EXISTS sync_initial_guard(
 id INTEGER PRIMARY KEY CHECK(id=1),
 target TEXT NOT NULL,
 owner_device_id TEXT,
 snapshot_hash TEXT,
 backup_ref TEXT,
 used_operation TEXT
);
INSERT OR IGNORE INTO sync_initial_guard(id,target) VALUES(1,'legacy-acceptance-v23');
-- Owner explicitly reviews device ID + snapshot SHA256 + independent backup reference.
-- Grant must remain NULL until that review. A device approval alone is NOT a bootstrap grant.
