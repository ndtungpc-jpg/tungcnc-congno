# Customer typography and unified sharing — Preview, 2026-11-27

Scope: existing feature/official-order-report-preview only. No Production deployment.

- Customer names remain inline next to order date. Dark themes: #C5CAD2 / 500; date #9CA3AF / 400. Light theme uses readable dark grays. Original title, font sizes, spacing, card markup and ID navigation remain unchanged.
- Report and reminder Share now prepare one Web Share payload: original reminder/report summary text, every PNG page in order, then the selected QR as a separate image. Unchecked QR is omitted.
- Reminder report selection is rendered on demand if not ready or stale. Rendering failure blocks sharing rather than dropping the report.
- Complete-payload capability checks; cancellation retains content; retry and ordered per-component sharing/copy/download remain explicit. Each successful sequential step advances automatically. Share-sheet completion is never presented as delivery.
- No automatic reminder export/history writes from the unified share flow, including its sequential fallback. Existing history records and accounting/sync/storage implementations remain unchanged.

## Validation

PASS `sync/tests/share-bundle.cjs`: text + one page; multi-page + QR ordering and original bytes; reminders with/without QR and with/without selected report; auto-render; unsupported payload; cancellation; sequential fallback; stale text; no ledger/history writes; saved QR retained.

PASS `sync/tests/customer-inline-link.cjs`: Orders and recent-order cards match original DOM after unwrapping the inline name. Click/keyboard resolves customer ID, stops order activation; rest opens order; state unchanged.

PASS `sync/tests/official-report.cjs`: report totals, quantity precision, dates, grouping, PNG, PDF pagination, Excel, preview bytes and ID navigation remain valid.

Browser 412px fixture: customer rgb(197,202,210), weight 500; date rgb(156,163,175), weight 400; customer font 11px. Card heights remain 61.546875 / 61.546875 / 60.546875 px; scrollWidth = clientWidth = 374px. Customer click opens profile. Unsupported-share UI retains components and explains limitations.

## Acceptance still required on physical device

No physical Samsung S24 Ultra / installed Android Zalo or SMS receiver was available. Web Share can validate browser payload support but cannot inspect which target was chosen, guarantee that target retains text/all files/order, or confirm actual delivery. Test in a disposable conversation: one-page + text; multi-page + text + QR; reminder with/without QR; verify attachment count and text before sending. If target drops/reorders components, use the retained sequential flow. A fresh share click is available if async preparation loses transient activation.

QR continues to use its existing device-local store; no cross-device QR sync was added. No ledger IndexedDB/D1 schema, migration/reset, sync, accounting formula or finalized report renderer was modified. Tests use isolated synthetic data; no Production data was imported.
