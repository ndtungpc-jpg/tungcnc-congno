# A03 — isolated design prototype

Not imported by the app, service worker, or Cloudflare Worker. No network, credentials, real IndexedDB, or staging database connection. No cleanup executor. All payloads are generated synthetic fixtures; output databases/checkpoint pages stay under a newly allocated OS temporary directory, not GitHub.

Node24+:

- `npm run test:a03-scale` from sync: protocol edges, current Worker VM cap probe and four SQLite replica/checkpoint benchmarks.
- `npm run test:a03-app-restore`: actual current application import/preview/confirm/save/render in jsdom/fake IndexedDB, four sizes. Requires existing test dependencies via NODE_PATH; the10k case can take several minutes. This does not measure physical disk, PWA layout or network.

`model.cjs` preserves order/payment JSON payloads and IDs, uses indexed technical projections, transaction/CAS, immutable paged checkpoint with receipts/quote keys/full operation archive, signed in-memory ACK registry and dry-run plan. It refuses an existing restore file or nonempty checkpoint directory. `executable` is always false.

Positive off-device attestations in tests are synthetic. Copying a checkpoint directory within the host is NOT independent off-device storage. Real plans remain blocked. There is no durable ACK API, live D1 adapter, client migration, garbage collector or archival scheduler.

The prototype is NOT a full replacement for application business validation/authentication: nested-data/date/legacy restore/audit/trash parity and affected-record validation must be integrated and regressed before deployment. Whole-table SQL validation is used for the benchmark; D1 CPU/quota, very large single records/payment groups and cross-runtime canonical encoding remain unverified. Never point this model at an existing business database.

See docs/v2.3/A03-SAFE-CHECKPOINT-DESIGN.md and STORAGE-POLICY.md. Production remains NO-GO.
