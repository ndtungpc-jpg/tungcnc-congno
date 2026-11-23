PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE sync_devices(id TEXT PRIMARY KEY,public_jwk TEXT NOT NULL,origin TEXT NOT NULL,label TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),created_at INTEGER NOT NULL);
CREATE TABLE sync_nonces(device_id TEXT NOT NULL,nonce TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(device_id,nonce));
CREATE TABLE sync_rates(bucket TEXT PRIMARY KEY,n INTEGER NOT NULL);
CREATE TABLE sync_state(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,data TEXT NOT NULL,versions TEXT NOT NULL,last_op TEXT);
INSERT INTO "sync_state" ("id","version","data","versions","last_op") VALUES(1,0,'{"schemaVersion":2,"revision":0,"partners":[],"orders":[],"payments":[],"audit":[],"trash":[],"recovery":[],"excelImports":[]}','{}',NULL);
CREATE TABLE sync_operations(operation_id TEXT PRIMARY KEY,device_id TEXT NOT NULL,payload_hash TEXT NOT NULL,sequence INTEGER NOT NULL UNIQUE,body TEXT NOT NULL,at INTEGER NOT NULL);
CREATE TABLE sync_initial_guard(
 id INTEGER PRIMARY KEY CHECK(id=1),
 target TEXT NOT NULL,
 owner_device_id TEXT,
 snapshot_hash TEXT,
 backup_ref TEXT,
 used_operation TEXT
);
INSERT INTO "sync_initial_guard" ("id","target","owner_device_id","snapshot_hash","backup_ref","used_operation") VALUES(1,'legacy-acceptance-v23',NULL,NULL,NULL,NULL);
