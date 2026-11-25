# Preview Hotfix 03

UI-only patch on the existing Preview branch. Remove the dashboard footnote only, retaining all backup/recovery/integrity functions.

Receipt allocation adapts the original showMultiOrders output and keeps its checkbox IDs/order plus the original submitMultiPayment command. Automatic mode submits all currently eligible outstanding orders without asking for selection. Manual mode exposes vertical checkbox cards; amount changes retain manual choices, customer changes reset them, returning to automatic discards them. Estimates follow the same original order and amount limits; excess remains blocked by the unchanged save command. Existing working-session snapshots carry only receipt UI metadata to restore manual choices safely; older incompatible receipt drafts are blocked for review.

History API integrates existing tab/openCustomer/openSupplier/modal/closeModal and receipt suggestions. One transient entry per modal and one for suggestions; replacing a modal does not add extra entries. Browser Back dismisses suggestions first, then uses the existing unsaved-input confirmation before closing the modal, then returns through route history. Ledger records are never stored in History. Existing beforeunload protection remains active. A reload starts a fresh UI history boundary; discarded forms are not recreated by Forward.

PASS focused automatic tests: syntax; preview-hotfix03.cjs (automatic oldest-first save/group totals; manual save; checkpoint of UI draft/manual selection; amount-change selections; auto/manual resets; excess warning; no allocation table; route/detail/modal/suggestion Back; declined/accepted unsaved-input exit; close/open modal chain without extra Back; no ledger change from navigation); overview-v11.cjs; preview-hotfix02.cjs.

Physical Samsung S24/Android keyboard/PWA and actual Cloud PC-S24 sync require device acceptance. No API, Worker, auth, D1/IndexedDB schema, sync or accounting data change. No Production deploy.
