# V2.3 RC1 — Safe initial bootstrap for historical ledgers

Staging only. No main merge, production change, IndexedDB reset, rounding,
ledger cleanup, A03, checkpoint or retention. This supersedes the initial
bootstrap blocker in LEGACY-DATA-ACCEPTANCE.md; physical acceptance is still open.

## Design and actual limits

| Boundary | Limit / behavior |
| --- | --- |
| Existing normal push | 1,000,000 UTF-8 request bytes, 2,000 changes; unchanged |
| Normal reconciliation client | 900,000 bytes / 2,000 changes, one operation; unchanged |
| Initial bootstrap HTTP | One gzip/base64 snapshot request under 1,000,000 bytes; base64 field <=800,000 characters |
| Initial decompression | Streaming bound of 1,900,000 bytes; invalid gzip/UTF-8/hash rejected |
| Application snapshot cap | 5,000,000 bytes retained, but not a promise of usable D1 row capacity |
| D1 platform | Maximum string/BLOB/table row: 2,000,000 bytes; SQL text: 100,000 bytes; 100 parameters |
| D1 application safety bound | 1,900,000 bytes for snapshot + versions + last_op, and separately for the receipt row; leaves headroom for SQLite metadata |
| Workers platform | At least 100 MB domain request limit, 128 MB isolate memory; CPU allowance depends on plan (Free 10 ms). Our 1 MB request bound is stricter |

Sources: https://developers.cloudflare.com/d1/platform/limits/ and
https://developers.cloudflare.com/workers/platform/limits/ .
Request is read with a byte cap before JSON parsing. Decompression is also capped.
A snapshot can fit 5 MB and still fail the D1 row/request guard; errors retain local
main, pending operations and bootstrap request. No forced split or rounding.

The snapshot contains every replicated collection and non-recovery root metadata,
including historical appliedAdjustments, audit, trash, dates, fractional Number
values and payment groups. Local technical recovery blobs stay intact on the
source and in the full independent backup; they are not duplicated into every
remote ledger. Source revision/recovery metadata does not become business history.

## Atomicity and permission

`POST /api/sync/bootstrap` exists only with `INITIAL_BOOTSTRAP_TARGET=legacy-acceptance-v23`.
It is not enabled on the old staging Worker. New isolated D1 alone receives the
additional guard table during initial schema setup; no existing DB is migrated.

1. Register per-device P-256 identity; owner checks the exact ID before approval.
2. Source computes immutable snapshot, raw UTF-8 SHA256, compressed request and sizes.
3. Read-only status must show sequence 0, no operations, empty ledger, correct target.
4. Owner separately grants exact source device + snapshot hash + independent backup
   reference. Approving a device alone does not permit initial bootstrap.
5. Client requires both owner-source/isolated-target and backup confirmations.
6. Persist the same operation ID, compressed bytes, snapshot and source backup in
   IndexedDB before network I/O. Source ledger is not replaced during bootstrap.
7. D1 batch atomically updates state, writes the full initial-snapshot receipt and
   consumes the grant. SQL CAS checks exact prior data/versions, sequence 0, empty
   operation log, unchanged grant and device approval inside the transaction.
8. A lost ACK retries the same operation ID/body. Same payload returns duplicate;
   changed body with same ID conflicts. A second snapshot cannot overwrite the DB.
9. Empty B receives sequence 1 as a complete snapshot in one IndexedDB transaction,
   with cursor and versions. Any nonempty differing local ledger/pending work blocks
   automatic replacement. Main/cursor rollback together on storage failure.
10. Subsequent edits use ordinary versioned operations. Versions from initial receipt
    are 1 for every record; pending edits after initial enqueue use that baseline.

Existing connections remain pinned to their current endpoint. New acceptance
connections are an explicit choice saved with their device metadata. No automatic
retargeting of old devices or queues.

## Resource separation / backups

| Resource | Identifier |
| --- | --- |
| Old staging D1 — untouched | 49163cc1-a60d-49b1-9c93-da7a6f939977 |
| Owner acceptance D1 — reserved empty | f8df0e48-5c48-4c2d-8546-deb95d3b1292 |
| Owner acceptance Worker | tungcnc-sync-v23-legacy-acceptance |
| HTTP rehearsal D1 — separate, no owner acceptance data | 455c0795-ebac-4336-910f-3a85fded40bf |
| HTTP rehearsal Worker | tungcnc-sync-v23-bootstrap-rehearsal |

Owner acceptance endpoint:
https://tungcnc-sync-v23-legacy-acceptance.ndtung-pc.workers.dev .
Old staging endpoint/config stays unchanged. A/B/C are test Pages projects;
production main/custom domain is not touched.

The actual empty acceptance D1 SQL export is saved as
`evidence/legacy-acceptance-empty.sql`; restored into independent SQLite with
integrity_check=ok, sequence 0, zero operations/devices and NULL bootstrap grant.
Hash is in `evidence/initial-bootstrap-target.json`. This is a baseline backup,
not permission to restore over later transactions. Keep a full owner PC JSON/ZIP
backup independently before approving the grant.

## Evidence and honest acceptance status

PASS local automated protocol and safety tests; see initial-bootstrap-*.log.
PASS synthetic fixture: 119 customers, 619 orders, 46 payments, 2,223 record changes.
PASS historical backup COPY: 118 customers, 619 orders, 20 payments, from 20/11;
all IDs/raw values/dates/allocations/metadata equal before/after. This older file is
NOT the current owner PC ledger with 119 customers/46 payments. Source file unchanged.
PASS both local/D1 transactional failures, stale preview, concurrent device revoke,
wrong hash, missing owner/backup grant, gzip expansion cap, oversized request,
nonempty destination, operation ID collision, lost ACK, offline persisted retry,
independent B receive and two-way payment tests on copies.

NOT PASS physical PC/S24 or exact current-source acceptance. Live HTTP automation
was blocked by edge 403/1010 even for generated synthetic data. Automatic approval
review separately rejected transmitting the private historical backup to the
rehearsal endpoint. No private historical data was transmitted by that test.
The live test utility now generates synthetic data only and cannot open a private
source file. Local historical tests never upload their source JSON.

## Owner procedure — PC A to S24 B

1. PC A: use the SAME browser profile and staging origin already containing the
   authoritative data. Save/close forms, export an independent full JSON/ZIP backup.
   Do not import the older test file or use the rehearsal Worker as your ledger.
2. Update the staging app. Open **Thêm → Chờ đồng bộ** (or the sync indicator).
   On the read-only diagnostic screen, choose
   **Kết nối kho nghiệm thu riêng · PC A / S24 B**. Confirm the separate target,
   name the device `PC A — dữ liệu lịch sử`. Copy its device ID for owner approval.
   This saves backup/identity; it does NOT upload the ledger.
3. Owner approves ONLY that exact device in acceptance D1. No approvals in old
   staging/rehearsal/production. PC A → **Thử đồng bộ lại**, then reopen the menu.
4. Choose **Xem trước khởi tạo snapshot nguyên tử**. Verify target is isolated,
   empty, size limits PASS and counts match current PC (119/619/46). Compare raw
   balances, not only the rounded dashboard. Record snapshotHash and independent
   backup reference. Owner grants that exact device/hash/backup on acceptance D1.
5. Close/reopen preview if the underlying data changed. Check the two confirmations,
   then **Xác nhận khởi tạo nguyên tử**. Keep PC source/backup. If network drops,
   press **Thử đồng bộ lại**; never delete/reset the queue or create another snapshot.
6. S24 B: use https://v23-b-tungcnc.pages.dev/ in the intended browser/PWA profile.
   Verify it is empty; back up anything found. Update app, choose the SAME separate
   acceptance target and name `S24 B`. Send its exact ID for approval on acceptance D1.
7. After approval, close forms, **Thử đồng bộ lại**. Receive the complete initial
   snapshot. Compare customers/orders/payments, every ID and allocation, original
   dates and fractional amounts, balances and 118 debtors. No test transactions
   should be entered into the authoritative PC book during this comparison.
8. Export full JSON from PC and S24. Run offline:
   `node sync/tests/compare-legacy.cjs PC.json S24.json`.
   This checks every collection/ID and payment allocation. Initial receive tests
   also compare non-recovery root metadata; technical recovery copies remain local.
9. Two-way transaction acceptance uses a COPY in a distinct browser profile and a
   distinct approved D1, not the authoritative PC ledger. Only after per-ID comparison
   and physical two-way acceptance may RC1 release status be reconsidered.

Administrative grant template (do not run with guessed IDs/hashes):

```sql
UPDATE sync_devices SET status='approved' WHERE id=? AND status='pending';
UPDATE sync_initial_guard SET owner_device_id=?,snapshot_hash=?,backup_ref=?
WHERE id=1 AND target='legacy-acceptance-v23' AND used_operation IS NULL
AND EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=0 AND last_op IS NULL)
AND NOT EXISTS(SELECT 1 FROM sync_operations);
```

Re-read the guard and target counts after approval. The grant stays NULL until the
owner has reviewed a concrete device/hash and confirmed a retrievable backup.

## Rollback / interrupted bootstrap

Before commit: do not acknowledge or alter source; DB either stays empty or has one
complete initial snapshot. On failure, retain persisted bootstrap ID/body and retry.
After commit but before ACK: receipt proves the same snapshot; retry cannot duplicate.
After later transactions: never restore the empty SQL or initial source over the DB.
Freeze acceptance writes by revoking its approved devices (local book/queue remain),
export the latest D1, operation receipts and each local pending queue, then reconcile
into a NEW isolated DB if recovery is needed. Retain the original DB for comparison.
Do not roll the acceptance client back to a version that cannot read initial-snapshot
receipts. No reset, cleanup or history deletion is part of this patch.
