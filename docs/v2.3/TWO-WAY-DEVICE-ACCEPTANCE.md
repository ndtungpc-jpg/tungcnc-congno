# RC1 — Physical two-way protocol acceptance

Historical initialization/receive accepted at sequence 2: owner PC A and S24 B
exports contain the same 2,224 records and non-recovery metadata as acceptance D1.
Canonical records SHA256:
`fef2d33ef5bfd3336ef022f1e76a6d9fa79874ddb6b5fa15622a9efc91e8c3bd`.
118 active customers, 619 orders, 46 payments. Deletion of TEST on PC is recorded
in audit and trash. No additional writes to the real acceptance ledger are part
of the following protocol tests. Root technical recovery copies differ by device.

## Separate target

Use https://v23-c-tungcnc.pages.dev/docs/v2.3/rehearsal/ on BOTH PC and S24.
The test page has its own native IndexedDB `tunggiang-rc1-rehearsal-v1`, own device
keys and the existing, previously empty rehearsal D1
`455c0795-ebac-4336-910f-3a85fded40bf`, through
`tungcnc-sync-v23-bootstrap-rehearsal.ndtung-pc.workers.dev`.
There is no file import or configurable endpoint. It generates only synthetic
records and does not load the real app client, inbox, reminder UI or real DB.
No bootstrap of a private backup into this target is authorized or performed.

Owner acceptance D1 `f8df0e48-5c48-4c2d-8546-deb95d3b1292`, old staging and
production are not targets for this test. Rehearsal device approval is separate
from PC A/S24 B approval; do not copy their keys or reuse those identities.

The small rehearsal service worker is registered only at
`/docs/v2.3/rehearsal/`, caches only this page and shared read-only JS assets,
never API responses, and does not reset/delete any IndexedDB or real app caches.
Wait for its offline-ready indicator before testing actual airplane mode and
close/reopen. The checkbox offers a separately labeled simulated network cut.

## Device steps and exact expected balances

1. PC opens test URL, selects PC thử, registers. S24 opens SAME URL, selects S24 thử,
   registers. Send the two new rehearsal device IDs. Admin checks their labels,
   origin and target, then approves only those two rehearsal identities.
2. Both press Đồng bộ / Thử lại; verify approved and queue 0.
3. PC creates 3 synthetic orders in one commit. S24 syncs: 3 orders, 6,000,000 due.
4. S24 collects 450,000 split into 100,000 / 150,000 / 200,000 on the three orders.
   PC syncs: exactly 3 payment allocation rows, 450,000 received, 5,550,000 due.
   All carry the same group ID, group size 3, and historical date 2026-11-01.
5. PC checks Bỏ ACK, then collects 125,000. First request commits to rehearsal D1
   but deliberately throws away its success response. Source shows pending/error.
   Press sync again on both. Exactly one PC payment exists; 575,000 received,
   5,425,000 due, queue 0. A retry uses the existing queue/operation ID.
6. S24 checks Ngắt mạng thử, collects 75,000, verifies queue 1. Close tab and reopen
   SAME URL/profile. The SAME test device and pending payment must remain.
   Uncheck network cut and sync both: 650,000 received, 5,350,000 due.
   Actual airplane mode can be tested additionally after offline-ready is shown;
   restore connectivity before expecting a server comparison.
7. Both press So với D1 thử. Require matching local/server hash, cursor 4, queue 0,
   no conflict, complete transaction flag true, 1 synthetic customer, 3 orders,
   5 payment allocation rows. Export separate PC/S24 test JSON reports and compare.
8. Repeated transaction buttons must refuse duplication and create no extra commit.
   Keep all evidence. Do not reset a device or delete test transactions to retry.

## Automated evidence and limits

`node sync/tests/two-way-page.cjs` exercises the actual test page handlers with
separate jsdom + native API-compatible fake IndexedDB factories and the production
sync engine/Worker handler against transaction-capable isolated SQLite.
It verifies both directions, grouped payment, lost ACK, offline restart identity/
queue persistence, exact final balances/hash, duplicate guard, export without keys,
requests only to the rehearsal endpoint and untouched real-ledger sentinel DBs.
See `evidence/two-way-page.log`.

Physical PC/S24 protocol acceptance: PENDING owner device actions. This test page
is protocol acceptance, not a substitute for all business forms, PWA/Android ZIP,
print/export and production release gates. No main merge or production deployment.
