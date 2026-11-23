-- OPTIONAL owner-admin initial import only, on a verified EMPTY isolated destination.
-- This is not a checkpoint, migration of populated data, or a public-device route.
-- Apply only after separate owner approval; do not attach or run on existing ledgers.
CREATE TRIGGER IF NOT EXISTS sync_admin_initial_before
BEFORE INSERT ON sync_operations
WHEN json_extract(NEW.body,'$.bootstrapMode')='owner-admin-once'
BEGIN
 SELECT CASE WHEN
  NEW.sequence=1 AND json_extract(NEW.body,'$.type')='initial-snapshot'
  AND json_extract(NEW.body,'$.schemaVersion')=1
  AND json_extract(NEW.body,'$.operationId')=NEW.operation_id
  AND json_extract(NEW.body,'$.deviceId')=NEW.device_id
  AND json_type(NEW.body,'$.snapshot')='object'
  AND json_type(NEW.body,'$.versions')='object'
  AND length(CAST(NEW.body AS BLOB))+length(NEW.payload_hash)+length(NEW.device_id)+length(NEW.operation_id)<=1900000
  AND length(CAST(json_extract(NEW.body,'$.snapshot') AS BLOB))+length(CAST(json_extract(NEW.body,'$.versions') AS BLOB))+length(NEW.operation_id)<=1900000
  AND EXISTS(SELECT 1 FROM sync_devices WHERE id=NEW.device_id AND status='approved')
  AND EXISTS(SELECT 1 FROM sync_initial_guard WHERE id=1 AND used_operation IS NULL
   AND owner_device_id=NEW.device_id AND target=json_extract(NEW.body,'$.target')
   AND snapshot_hash=json_extract(NEW.body,'$.snapshotHash')
   AND backup_ref=json_extract(NEW.body,'$.backupRef') AND length(backup_ref)>0)
  AND EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=0 AND last_op IS NULL AND versions='{}'
   AND data='{"schemaVersion":2,"revision":0,"partners":[],"orders":[],"payments":[],"audit":[],"trash":[],"recovery":[],"excelImports":[]}')
  AND NOT EXISTS(SELECT 1 FROM sync_operations)
 THEN 1 ELSE RAISE(ABORT,'Owner admin bootstrap grant/destination mismatch') END;
END;
CREATE TRIGGER IF NOT EXISTS sync_admin_initial_after
AFTER INSERT ON sync_operations
WHEN json_extract(NEW.body,'$.bootstrapMode')='owner-admin-once'
BEGIN
 UPDATE sync_state SET version=1,data=json_extract(NEW.body,'$.snapshot'),versions=json_extract(NEW.body,'$.versions'),last_op=NEW.operation_id WHERE id=1 AND version=0;
 SELECT CASE WHEN changes()=1 THEN 1 ELSE RAISE(ABORT,'Owner admin initial state CAS failed') END;
 UPDATE sync_initial_guard SET used_operation=NEW.operation_id WHERE id=1 AND used_operation IS NULL;
 SELECT CASE WHEN changes()=1 THEN 1 ELSE RAISE(ABORT,'Owner admin initial grant CAS failed') END;
END;
