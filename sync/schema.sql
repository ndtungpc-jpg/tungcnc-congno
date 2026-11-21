CREATE TABLE IF NOT EXISTS sync_devices(id TEXT PRIMARY KEY,public_jwk TEXT NOT NULL,origin TEXT NOT NULL,label TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sync_nonces(device_id TEXT NOT NULL,nonce TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(device_id,nonce));
CREATE TABLE IF NOT EXISTS sync_rates(bucket TEXT PRIMARY KEY,n INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sync_state(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,data TEXT NOT NULL,versions TEXT NOT NULL,last_op TEXT);
INSERT OR IGNORE INTO sync_state(id,version,data,versions) VALUES(1,0,'{"schemaVersion":2,"revision":0,"partners":[],"orders":[],"payments":[],"audit":[],"trash":[],"recovery":[],"excelImports":[]}','{}');
CREATE TABLE IF NOT EXISTS sync_operations(operation_id TEXT PRIMARY KEY,device_id TEXT NOT NULL,payload_hash TEXT NOT NULL,sequence INTEGER NOT NULL UNIQUE,body TEXT NOT NULL,at INTEGER NOT NULL);
