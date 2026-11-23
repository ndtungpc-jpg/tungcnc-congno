# RC1 — PC / S24 sync acceptance results

Date: 23/11/2026 (Vietnam). Branch: feature/v2.3-sync-foundation.
Runtime bootstrap baseline: 302000ab5e51dfed70fe1f4e15307e3a0cbacf94.
Rehearsal page baseline: 2e83bd77ffc9cf31fde16cbb9905c85c8c4292cf.

**PASS for the scoped historical initialization, receive, record reconciliation and
physical-device two-way protocol tests below. Production release remains NOT APPROVED.**
No main merge, production deployment, rounding, IndexedDB reset, A03 or cleanup.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Current owner backup parses and restores | PASS automated | Actual app restore in isolated jsdom/fake IndexedDB; source file unchanged; original 1,438 audit and 8 recovery entries retained, restore adds its own technical entry |
| Atomic historical snapshot PC A -> isolated acceptance D1 | PASS live | Exactly one initial-snapshot receipt at sequence 1; actual stored snapshot SHA256 equals approved backup/PC hash |
| Historical receive on S24 B | PASS live | Owner device screenshots plus independently checked S24 export; no pending operations/conflict |
| PC A / S24 B / D1 reconciliation at sequence 2 | PASS exact records | 118 active customers, 619 orders, 46 payments, 1,439 audit entries, 2 trash entries; 2,224 keyed records and non-recovery root metadata match |
| Synthetic PC -> S24 orders | PASS live | Three orders received as one atomic operation; total 6,000,000 |
| Synthetic S24 -> PC grouped receipt | PASS live | Three allocations 100,000 / 150,000 / 200,000, one group of size 3, original date 2026-11-01 retained |
| Deliberate lost ACK and retry | PASS injected fault on real PC | Error screenshot shows cursor 2 / queue 1 after server commit; retry yields cursor 3 / queue 0 on both, one 125,000 payment only |
| Simulated offline pending receipt / reopen / reconnect | PASS scoped simulation | S24 evidence retains same stored test identity, cursor 3 / queue 1; reconnect yields exactly one 75,000 payment; this is the labeled network-cut simulation, not an airplane-mode or power-loss claim |
| Final synthetic PC / S24 / D1 | PASS exact exported data | Full test data equal; 1 synthetic customer, 3 orders, 5 allocation rows; received 650,000, due 5,350,000; cursor 4 / queue 0 / no conflict on both |
| Real acceptance ledger unaffected by synthetic tests | PASS live inventory | Separate D1s and local DB names; real D1 stays sequence 2 / 2 operations, rehearsal D1 sequence 4 / 4 operations |

## Reproducible hashes

Canonical keyed-record SHA256 for real ledger at sequence 2:
`fef2d33ef5bfd3336ef022f1e76a6d9fa79874ddb6b5fa15622a9efc91e8c3bd`.
Canonical non-recovery root metadata SHA256:
`5a5d56e24efdc102c8e5f171542fc020fb798d3886354f796eadbddc3636ff76`.

Canonical synthetic keyed-record SHA256, independently recalculated from both
owner-uploaded reports and matching their server-comparison hashes:
`b78829384a1d9848b45d8226ac22b879fae4dd28770cac498e83f5da8aa833ac`.
The two final synthetic `data` objects are also deeply equal, including row order.

Private financial exports, recovery snapshots, device private keys and raw D1
credential tables are not committed to this repository. Evidence came from the
owner's PC/S24 exports and screenshots plus read-only D1 checks.
Local technical recovery snapshots are intentionally device-specific; differences
there do not imply a business-ledger mismatch. No historical value was rounded.

## Remaining release gates

This closes the scoped sync acceptance, not the entire RC1 release checklist.
Physical airplane-mode/OS kill/power-loss cases, physical conflict resolution,
Android/PWA/ZIP/Excel acceptance, and end-to-end production freeze/rollback with
new transactions must retain their actual statuses in RELEASE-CANDIDATE.md and
related checklists. Automatic tests do not replace those device checks.

The rehearsal page exercises the same sync engine and Worker protocol with fixed
synthetic transactions. It is not a full test of every business form on the normal
application. Test data remains isolated and is not imported into the real ledger.
No synthetic devices were granted access to the real acceptance D1 by these tests.
