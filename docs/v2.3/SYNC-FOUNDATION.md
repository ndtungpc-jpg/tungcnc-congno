# TÙNG GIANG CNC — v2.3 staging implementation

The owner's implementation request supersedes the earlier design-only gate. This branch integrates v2.1.9 inbox commits through 416b4f55 without altering main or PR #6. Production remains gated.

## Resources and data
- NEW Worker `tungcnc-sync-v23-staging` and NEW D1 `49163cc1-a60d-49b1-9c93-da7a6f939977`, APAC; no shared inbox tables/credentials.
- Accounting database name, version 1, `state` store and `main` key stay unchanged. A separate key `tg-sync-v23` in that existing store contains sync metadata, outbox, cursor, nonextractable device key, conflicts and recovery snapshots. No schema upgrade/reset/migration.
- Opt-in on staging only. Before enabling, atomically persist a complete original accounting backup and block populated-store upload until explicit snapshot review. Existing localStorage/fallback is untouched. Sync is blocked when durable IndexedDB is unavailable.
- A local save writes accounting `main` and the immutable queued operation in ONE IndexedDB transaction with revision + content + metadata CAS. No queue can be lost between saving an order and enqueueing it.

## Authentication
Each device creates an ECDSA P-256 private CryptoKey (nonextractable) and public key; owner verifies device ID and approves public key via authenticated D1 console. No passwords, API tokens or shared secrets in frontend/localStorage. Requests sign method/path/query/time/nonce/body SHA-256. Server verifies origin, device status, signature, 2-minute clock window and one-time nonce on every request. Revocation is immediate; queued/local data stays intact.
XSS can still invoke a nonextractable key from a compromised running origin; this is not an absolute security guarantee. Device clocks must be correct. Review rate/nonce retention before long-running production.

Owner approval: inspect `SELECT id,label,origin,status FROM sync_devices;`, compare exact ID with device, then `UPDATE sync_devices SET status='approved' WHERE id='<verified-ID>' AND status='pending';`. Revocation changes status to `revoked`. Do not approve unverified labels. Pilot target is 2–3 devices; do not approve arbitrary registrations.

## Protocol
`POST /api/sync/push` accepts a stable operationId, deviceId, schemaVersion1 and atomic changes `{kind,id,baseVersion,payload}`. Collections: partners, orders (including nested items/sizes), payments, audit, trash, Excel import receipts and reminderTemplates. All other local fields are preserved locally; recovery snapshots are never replicated as ordinary records.
- Server rechecks every record version, validates full resulting accounting state, payment allocations and global quote IDs/codes, then uses an atomic D1 batch for state CAS + append-only operation receipt.
- Global server sequence orders transactions, per-record versions detect conflicts. Timestamps do not select winners. A repeated operation ID with a changed body is rejected.
- Pull is a bounded ordered immutable log. Apply and cursor advancement are in ONE local transaction. Before remote apply preserve a full local backup. Replay is idempotent; owned operations acknowledge queue without overwriting newer local edits.
- Foreign changes touching queued records or invalidating debt invariants stop with both versions retained for explicit review. Cursor does not skip the conflict. Offline editing remains available, but the UI never reports synced while conflicts/queue remain.
- Deletes retain server log/tombstone versions and existing business trash/audit. No hard-delete endpoint. No automated deduplication by customer name/phone.

## UI and operation
One button shows Đã đồng bộ / Đang đồng bộ / Chờ đồng bộ / Lỗi đồng bộ. It opens enable/device ID, queue/cursor, balances, retry, revoke, and export of review + original backup. No auth key is exported in the business/recovery JSON. Automatic foreground/open/online sync every15 seconds. Remote application pauses while forms or unsaved app state are open.

## Limits and release gates
This is a staging pilot, not production acceptance. Limits: 1MB push, 2000 changed records per transaction, 5MB cloud snapshot; additive legacy onboarding is chunked by dependency in batches targeting 200 records/400KB; indivisible financial groups remain atomic. A single oversized related edit remains local and is rejected without truncation. Recovery snapshots/nonce storage currently require retention design before extended deployment. Conflicts retain both versions but require owner review; no automatic monetary overwrite or silent queue discard.
Three isolated browser origins may simulate three devices; that does not replace physical Android/PWA offline and lifecycle tests. Historical anonymized backups and production debt reconciliation remain required. No production merge or launch yet.

## Rollback
Disable staging clients or return Pages to pre-sync deployment. The new metadata key and backups must be preserved; never clear the accounting database. Worker rollback does NOT restore D1. Keep operation log/receipts/cursors when rolling code back. Before real-data activation export a user-owned JSON backup and test restore in an independent profile. The initial local backup is available through the sync review export.
\n## Explicit onboarding and reconciliation (22/11/2026)\nSigned GET /api/sync/snapshot supplies a consistent sequence/data/versions snapshot. Populated-store enable marks bootstrapPending; no initial upload occurs before read-only preview and confirmation. Preview compares exact IDs and requires choices for divergent versions/deletion conflicts. Different-ID suspect duplicates require acknowledgment, never automatic merge. Recheck snapshot and local CAS before applying. Backup includes previous outbox/conflict; main/metadata/rebased queue are one transaction. Identical records are reused; local-only additions and remote-only additions are included only after owner confirmation. Related monetary edits do not split. See DEVICE-GUIDE.md and ACCEPTANCE.md for actual evidence and incomplete physical acceptance.\n