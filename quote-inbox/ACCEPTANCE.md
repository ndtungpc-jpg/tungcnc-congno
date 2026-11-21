# v2.1.9 Async Quote Inbox — staging acceptance 2026-11-21

## Status
Staging works end-to-end on Chrome desktop with synthetic data. NOT released to production. PR #6 remains draft. Existing application header/version inherited from the newer main code has not been downgraded to 2.1.9.

## Fixes
- Replaced shared-password/stateless bearer login with individually approved/revocable 90-day device credentials; server keeps only SHA-256, origin and sender/receiver role.
- Added additive D1 device/rate/claim tables; did not alter existing quote table or accounting IndexedDB schema.
- Validates payload fingerprint, dimensions/quantity, item price/amount, discount, shipping and VAT on server and on accounting preview.
- Unique quote-ID and normalized-code claim acquired only at explicit import confirmation. Competing receiving devices cannot claim twice.
- A lost remote acknowledgment is recovered from committed local orders using status-only retry. Claims do not automatically expire/reassign.
- Blocks moving a remote quote to the local queue to bypass the cloud claim.
- Restored Bao Gia official PWA icons/manifest/SW from deployed icon commit; fixed script accidentally injected into print/PDF HTML.
- Added synchronous startup guard so a slow inbox-module load cannot silently fall back to popup transfer on staging.
- Fixed staging CSP connect-src, enabled only the named feature branch for Bao Gia Pages previews. Production branch and production deployment remain unchanged.

## Actual browser + real staging Worker/D1 results
| Check | Result | Evidence |
|---|---|---|
| Register devices and approve exact IDs | PASS | Two synthetic devices, separate origins and roles; credentials never printed/exported |
| Sender -> Cloud D1 pending -> receiver preview | PASS | BG-ASYNC-CUA-01, full MDF/Veneer Go and 1000x2000 dimensions |
| Discount/shipping/VAT | PASS | 1,000,000 - 100,000 + 50,000 + 95,000 = 1,045,000 VND |
| Preview/cancel without debt or claim | PASS | Accounting 0; D1 claims 0 after cancel |
| Explicit import and remote status | PASS | One detailed order, no payment, D1 imported |
| Repeat unchanged send | PASS | Server duplicate/imported; no additional order |
| Multiple items/dimensions, existing customer | PASS | BG-ASYNC-CUA-02: 3m2 @500,000 + 4.5md @100,000; discount100,000, shipping50,000, VAT190,000; total2,090,000; explicitly selected existing customer |
| Reload | PASS | 1 customer, 2 orders, 0 payments, receivable3,135,000; integrity0errors/0warnings |
| Simulated missing remote acknowledgment | PASS | Only synthetic D1 record 01 reset to pending to represent lost ACK; receiver reconciled imported without new local order |
| Per-device revocation | PASS | Revoked sender cannot send, UI reports revoked/expired; no additional quote |
| Physical Android/PWA installation/update/offline | NOT TESTED | No real Android device available |
| Historical user backups / real-device counts | NOT TESTED | No historical anonymized fixture or access to phone data |

## Automated results
- Real SQLite adapter + Worker handler: pending device denied, approval, role/origin isolation, malformed money/dimensions, repeated send, simultaneous device claim, revised quote-code lock, status retry, immediate revocation: PASS.
- Receiver adapter with fake IndexedDB: readonly preview/cancel, local-queue bypass blocked, denied claim, simulated quota failure rollback, full detail import, payments unchanged, recovery snapshot, remote-ACK failure and status-only reconciliation: PASS.
- Existing report/export/additive backup restore/payment group regression tests: PASS; restored groups retain metadata and balances in an independent fake database.
- JS syntax, both HTML inline scripts: PASS.

## Data reconciliation (synthetic only)
Before: 0 customers, 0 orders, 0 payments, receivable0.
After confirmed imports: 1 customer, 2 orders, 0 payments, receivable3,135,000; payable0.
Cloud: exactly2 imported quote rows; floating-point raw source totals retained, accounting uses existing VND rounding. No formula changed.
Actual business/production data never used or modified. Production Pages commits remain Cong No e4d6d39b7110f5fc44302aaaac3d26b42cc5f09f and Bao Gia ec021150698753f66e80f59ae2b0ae7bdab45f23.

## Remaining risks / release gates
- MEDIUM: bearer credential in localStorage is exposed to same-origin XSS or a compromised browser profile. Nonextractable-key/device challenge or protected session design requires further security work before broader rollout.
- MEDIUM: device approval/revocation currently uses the authenticated Cloudflare D1 console; no owner-facing approval screen yet. Verify exact device IDs outside untrusted labels.
- Claims stranded after loss of the original device require manual backup reconciliation; never auto-release or import on another device blindly.
- Manual JSON outside the cloud flow deduplicates locally only. This is not cloud synchronization of debt across devices; receive into one authoritative accounting dataset.
- A changed already-imported quote code is intentionally blocked from creating another debt. Reconcile/edit the original order manually.
- Physical Android lifecycle/offline/PWA and historical data remain NOT TESTED. No claim of full acceptance or absolute security.

## Recovery
See DEPLOYMENT.md for pre-migration D1 bookmark and non-destructive rollback. Preserve claims and current data when rolling code back; rollback does not restore data. No destructive restore was run against staging or production business data.
