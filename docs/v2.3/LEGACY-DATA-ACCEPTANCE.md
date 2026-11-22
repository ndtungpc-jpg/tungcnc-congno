# RC1 — Legacy data acceptance

Scope: minimal staging fix only. No main merge, production deploy, IndexedDB reset,
migration, rounding, deletion or business data correction.

PC A UI verified: 1,250,365,237 VND displayed; 118 customers to collect.
Independent backup confirmed by owner. Exact unformatted total and IDs must be
read from the diagnostic screen, never inferred from rounded dashboard text.

Root cause: sync/core.js required Number.isSafeInteger for orders.amount and
payments.amount while the legacy safety reader accepts finite nonnegative Numbers.
Transport now accepts those existing Numbers within MAX_SAFE_INTEGER magnitude,
without conversion, rounding or new fields. UI money input rules remain as before.
Invalid types/nonfinite/out-of-range values report collection, ID, field and value.
The read-only pre-enable screen lists every fractional amount and snapshot UTF-8 size.
No customer name, phone or full ledger is automatically logged to GitHub.

Snapshot cap remains 5,000,000 bytes. Reconciliation must be one operation;
2,000 changes / 900,000 serialized request bytes client ceiling, server ceiling
1,000,000 bytes. Exceeding either ceiling stops before local/cloud mutation.
No additive split to force a historical ledger through the cap.

Staging D1 read-only inventory: sequence 19; 15,193 bytes; 7 partners, 9 orders,
4 payments, 19 operations. Existing staging is NOT empty. Do not overwrite or
silently union it with the PC ledger. No staging data writes performed here.

## Acceptance procedure

1. PC: keep independent backup; stop entering transactions during comparison.
   Reload same staging origin/profile only after saving/closing all forms.
   Open Sync to view read-only diagnosis. Record exact amount/ID list, counts,
   unformatted balances and bytes. Close without enabling if any FAIL.
2. Compare source and destination export record-by-record using canonical JSON
   keyed by collection and ID. Compare dates, raw amounts, payment.orderId,
   paymentGroupId/size, cancelled flags, trash/audit and all item details.
   Compute per-order paid and balance and per-partner receivable/payable.
   Dashboard rounded total alone is insufficient evidence.
3. Current staging already has test records. Use a separately bound acceptance
   Worker/D1 and isolated browser origins/profiles for a COPY of the real ledger,
   or reconcile every existing staging ID explicitly before selecting any data.
   Do not point a copied client at the current D1 accidentally. Do not approve
   new device access until its device ID and intended environment are checked.
4. Bootstrap PC copy with preview, single atomic operation and reviewed totals.
   Empty S24 acceptance profile: backup any existing local data first, register
   correct device, approve explicitly, preview server data then receive.
   Verify every ID and payment, dates, raw amounts, balances and 118 debtors.
5. Only on isolated COPY: PC creates test order/payment, S24 receives; S24 creates
   test payment, PC receives. Verify one commit/receipt per operation, lost ACK,
   offline restart, conflict and cancellation. Keep real source ledger unchanged.
6. Export and restore copy in a third empty profile; repeat ID/raw-value comparison.
   If limits fail, stop. Do not delete audit/payments, split the ledger or round.

## Results

PASS automated: historical fractional order/payment exact full-record transport;
ACK loss, offline replay, conflict handling, restore; oversized bootstrap leaves
main/meta/cloud unchanged; invalid money diagnostics; 5 MB no-op cap.
PASS regressions: npm test; test:data-safety; test:backup-recovery; test:storage-policy.
NOT YET ACCEPTED: actual PC diagnostic IDs/bytes, real-data isolated two-device
round trip, physical S24 acceptance and full per-ID comparison.
Existing safety checks may reveal additional legacy inconsistencies after money
validation is fixed; stop and report those IDs, never silently repair business data.
