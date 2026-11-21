# TÙNG GIANG CNC — v2.3 Sync Foundation

Status: DESIGN ONLY — no sync endpoint, migration or production deployment is authorized by this document.

## Baseline confirmed from current main
- The accounting PWA stores a normalized single state snapshot in IndexedDB (DBNAME, STORE, key `main`), with a separate localStorage fallback.
- `commit()` increments `revision`, generates `audit` changes for ordinary edits and uses compare-and-swap checks before local writes.
- Core collections include `partners`, `orders`, `payments`, `audit`, `recovery`. Preserve every field, especially quote-related order details.
- v2.1.9 staging inbox D1 is **not** an accounting sync database. Do not repurpose its schema or credentials.
- The current `deviceId=id()` is created at runtime, so it is NOT a durable cross-session device identity. Introduce a persistent identity only after safe migration design.

## Architecture decision (proposed)
Offline-first: IndexedDB remains authoritative for the local working copy; a NEW isolated Cloudflare Worker + D1 database stores an append-only server change log, device registry, cursor checkpoints and encrypted backups if encryption is designed and verified. Server-assigned monotonic sequence is the sync cursor. A single client revision number is NOT a global conflict-resolution strategy.

Recommended initial rollout: single-writer pilot with other devices read-only, then explicit multi-writer after conflict handling is proven. Do not silently choose last-write-wins for monetary values.

## Data and protocol contract (proposed)
Each local change is an immutable operation:
`{operationId,deviceId,entityType,entityId,action,baseEntityVersion,occurredAt,payload,schemaVersion}`.
`operationId` must be stable across retries; server enforces unique IDs and an atomic insert + version check. `occurredAt` is for display, not ordering or conflict arbitration.

Server:
- `POST /api/sync/push`: bounded batch, per-operation result (accepted / duplicate / conflict / rejected), server sequence, atomic transaction where required.
- `GET /api/sync/pull?after=<cursor>`: bounded ordered immutable operations + nextCursor + hasMore.
- `GET /api/sync/status`: authenticated device status, lag and server schema.
- Device enrollment / revocation must be independent of v2.1.9 shared credentials. Every request checks active device authorization.
- Reject unknown schema versions, oversized payloads, malformed money, unrecognized entity IDs and unauthorized roles.

Local:
- Dedicated IndexedDB stores `outbox`, `syncMeta`, `syncConflicts`, `syncInbox` (or equivalent separate DB); do not change or delete the current accounting `main` store.
- In a single local transaction, persist the accounting state change and outgoing operation whenever technically feasible. If split databases prevent atomicity, implement a durable write-ahead/recovery protocol first.
- Pull into a staging area, validate, apply deterministically, then advance cursor only after the local accounting write succeeds.
- Do not claim synced when the server has not acknowledged the operation. Retrying must be safe after network timeouts.

## Accounting conflict policy
- `payments`: never sum two versions of the same payment or auto-delete an existing payment. Duplicate `operationId` is a no-op; conflicting changes require explicit reconciliation.
- `orders`: never silently overwrite `amount`, `quoteTotals`, cancellation state or paid allocations.
- `partners`: propose duplicate matches by name/phone, but do not auto-merge partner IDs.
- `quoteTransferId`: globally unique order-import key; preserve source fingerprint and v2.1.9 inbox import guarantees.
- Deletes: tombstones + audit trail, no hard deletion propagated automatically.
- `recovery` and backups: do not replicate local recovery snapshots as ordinary accounting changes; define a separate retention/encryption policy.
- Use integer VND where possible; reject unsafe numbers and verify debt invariants after every applied batch.

## Delivery slices
1. v2.3.0: compatibility audit, fixture generator, migration-free read-only sync prototype, isolated D1.
2. v2.3.1: device enrollment/revocation, stable device identity, append-only API, idempotency tests.
3. v2.3.2: local durable outbox, offline queue, pull staging, reconnect and restart recovery.
4. v2.3.3: single-writer pilot on synthetic data; compare customer/order/payment totals.
5. v2.3.4: multi-writer conflict review UI, monetary conflict protections, Android PWA testing.
6. v2.3.5: staged real-data migration with explicit backup/restore drill, rollback and acceptance.

## Mandatory acceptance matrix
- Two Android devices and one desktop; reload, app close/reopen, offline 24h, reconnect, repeated push, duplicated pull, reordered response, concurrent edits, revoked device, bad schema, partial D1 failure.
- Same quote imported concurrently on two devices: at most one accepted order.
- Payment edited concurrently: no silent money loss or duplicate payment.
- Acknowledge push then crash before local acknowledgment: retry is idempotent.
- Apply pull then crash before cursor persistence: replay is idempotent.
- For every test compare partner count, order count, payment count, per-customer debt and global debt to expected fixtures.
- No production deployment without passing tests, tested backup restoration and explicit release approval.

## Integration gate
Do not merge or rebase v2.3 onto the v2.1.9 feature branch while Work is editing it. After v2.1.9 acceptance, review merged main, rebase this isolated planning branch and verify actual schema, credentials, quote import and persistence contracts before implementing sync.
