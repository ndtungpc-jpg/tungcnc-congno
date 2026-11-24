-- New Preview checkpoint metadata only. No changes to accounting tables/data.
CREATE TABLE IF NOT EXISTS v24_sync_initial_jobs(id INTEGER PRIMARY KEY CHECK(id=1),session_id TEXT NOT NULL UNIQUE,device_id TEXT NOT NULL,manifest TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('uploading','complete')),next_index INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS v24_sync_initial_parts(session_id TEXT NOT NULL,part_index INTEGER NOT NULL,hash TEXT NOT NULL,content TEXT NOT NULL,PRIMARY KEY(session_id,part_index));
