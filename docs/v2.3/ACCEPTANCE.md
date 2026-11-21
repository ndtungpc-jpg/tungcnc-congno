# v2.3 staging acceptance — 2026-11-21

Working staging foundation; NOT production approved or fully accepted. PR7 is draft. Main remains e4d6d39b7110f5fc44302aaaac3d26b42cc5f09f. PR6 head 416b4f55eae495db80586f44e7b35213eea55672 inherited without merging production. Concurrent foundation/audit commits preserved; no force push.

## Live Chrome tests — synthetic data, three independent origins

- A: https://feature-v2-3-sync-foundation.tungcnc-congno.pages.dev/
- B: https://v23-b-tungcnc.pages.dev/
- C: https://v23-c-tungcnc.pages.dev/
- Separate Worker/D1: tungcnc-sync-v23-staging.

PASS: A created a 5,000,000 VND order; B/C received it automatically after device approval. B recorded 1,000,000 dated 2026-10-15; A/B/C showed 4,000,000 receivable and 0 received this month. D1 sequence 2, one payment.

PASS: A changed order to 6,000,000 while B retained an older edit form. B saved 7,000,000. Server/C retained accepted A version (5,000,000 receivable). B retained its local version and original payment (6,000,000 receivable), displayed conflict with outbox 1/cursor 2. D1 sequence 3, one payment. No silent overwrite or discarded change.

PASS: A retained queued order/device identity across reload after native-fetch fix, then uploaded successfully.

## Automated tests

Actual Worker handler, transactional SQLite, WebCrypto and three independent fake IndexedDB stores. PASS: pending approval; nonextractable keys; initial backup; full nested order/material/dimensions; backdated payment; lost ACK and repeated push; offline create/restart/reconnect; failed pull transaction preserving main/cursor; deferred apply status; concurrent monetary edits retaining both versions; global quote uniqueness; signed replay denial; revoked device blocked while local queue retained; independent backup restore; log/sequence reconciliation (6 commits).

Five debt audit tests PASS: totals, duplicate IDs/quotes, orphan payment, cancelled paid order, overpayment/invalid money and read-only behavior.

Run with Node 24+ and sync/package.json dependencies: `node sync/tests/sync.cjs`; `node --test docs/v2.3/debt-integrity-audit.test.mjs`.

## Fixes

- Wrapped native fetch to prevent browser Illegal invocation.
- Deferred remote apply now reports waiting instead of incorrectly reporting synced.
- Dialog counters identified as snapshot at opening.

## Safety and unfinished acceptance

Accounting IndexedDB name/version/store unchanged. Atomic main+outbox/main+cursor and stale-write checks. Production data not accessed, reset, migrated or overwritten. New metadata key holds backups and nonextractable device keys; business exports exclude keys. Cloud business data is plaintext behind authenticated signed TLS requests, not end-to-end encrypted.

CHUA KIEM THU: physical Android/PWA lifecycle/install/lock-screen; real anonymized historical backups; full inherited business regression; live quote inbox end-to-end on this v2.3 build. Three browser origins are not three physical devices. Offline/revoke/restore fault cases are automated, not all live browser.

Production blockers: conflict adjudication UI (currently block/export both); onboarding multiple already populated devices (conservative conflict, no automatic merge); backup/nonce/log retention; large initial-data chunking; security review and real-device acceptance. Snapshot limit 5MB, push 1MB/2000 changes: excess rejects with queue intact. No production release.
