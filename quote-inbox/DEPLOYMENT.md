# Async inbox staging — acceptance in progress

Worker: `tungcnc-quote-inbox-staging`; D1: `4c5f1ba6-592d-43a6-9d7c-b13fe8cd00fa`.
Only exact branch aliases `feature-quote-inbox-async-20` on the two Pages projects are allowed. Production hosts are intentionally rejected.

## Device enrollment and revocation
- Each app/device generates its own 256-bit random bearer credential and persists only in its own origin under `tg_quote_inbox_device_v2:<API>`.
- Server stores SHA-256 only, no shared password, no frontend secret. Existing v1 session key is left untouched but unused.
- Register from the app's Device button. The app displays a non-secret device ID. Owner must compare that ID with the actual device, not trust an arbitrary label.
- In authenticated Cloudflare D1 console inspect `SELECT id,label,origin,role,status,expires_at FROM inbox_devices;`.
- Approve only the verified ID: `UPDATE inbox_devices SET status='approved' WHERE id='<verified-id>' AND status='pending';`.
- Revoke: `UPDATE inbox_devices SET status='revoked' WHERE id='<verified-id>';`. The app also provides self-revocation. Expiry is 90 days; permission is rechecked for every request.
- Local bearer credentials can be stolen by same-origin XSS or compromised browser profiles. This is not an absolute security guarantee. Do not export them in business backup files.

## Import safety
- Cloud stores full quote payload, never customer debt/payment records.
- Preview and cancel do not change accounting data. Claim is acquired only when the user confirms.
- Unique claim on stable transfer ID and normalized quote code prevents another receiving device accepting the same quote/revision.
- Claims never expire or auto-reassign: after a crash retry on the original device. If the original local data is lost, reconcile its backup before any owner-assisted release. Never clear a claim just to retry.
- If commit succeeds but remote acknowledgment fails, reopening/refresh scans durable local orders and retries status only; no additional order is created.
- Manual JSON recovery retains existing local deduplication, but cannot provide a cross-device cloud guarantee when used outside this inbox flow.
- Sending failure/timeout is an unknown outcome. Send the same unchanged quote again for idempotent reconciliation. No automatic debt is generated.

## Rollback
- D1 pre-migration bookmark: `00000002-00000000-0000512a-46dd636a3dfee8c948a490229c7b55ca`; quote count before migration: 0.
- Migration adds three tables only. Existing quote table and local IndexedDB schemas untouched.
- Roll back Pages code to previous deployment and disable staging clients if needed. Do not restore D1 to an older bookmark after business writes without reconciliation: that would remove remote state/claims. Worker rollback alone does not roll back D1.
- Production remains unmodified until full acceptance. Android physical PWA tests and owner's historical backups remain unverified.
