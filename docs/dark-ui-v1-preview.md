# Dark V1 dashboard Preview
Base: Production92f0ef2477f84deee38057c406e01e2c7dc7e686 (v2.4.1). Branch feature/dark-ui-v1-preview. Preview only, no merge/Production authorization.

The attached full-height dashboard image is the layout authority. Other multi-screen images are style references only; no business-screen redesign. Existing render calculates the four metrics, dates, sorting and debt; Dark V1 decorates its output. No backend/schema/auth/accounting/reminder changes.

- Existing TG app logo, title and subtitle; actual version read from version.json. Metadata corrected from stale2.3.0 to current release2.4.1; this is not a new accounting release.
- Search opens existing customer search. Notifications opens existing quote inbox and reflects its actual pending count (no mock3 badge). Original sync button, real status and active handler retained. New isolated Preview hostname joins the presentation-only disabled sync view; no Cloud allowlist changes or false connected state.
- Four original nav targets, original statistic buttons/formulas; blue/purple/green/orange dark cards. No calendar/chart.
- Quick actions precede recent orders: existing create menu (retains quick and detailed order choices), supplier form, multi-order customer receipt, debt center.
- Existing recent-order renderer retained, including original dates/unknown-date status, amount/balance and ordering. Dashboard styles scoped to body.dark-v1-home; Light Mode retained, other business layouts unchanged.

Focused automated check: node sync/tests/dark-v1-preview.cjs — PASS metric values, four nav items, logo/three header controls, quick-action order/routes, original chronology, sync busy/synced state, unchanged source JSON and presence of existing business commands. No full old suite rerun.

Isolation: this branch hostname has no Cloud/API target. Browser-local fixtures only, no Production import. Do not equate disconnected Preview with an unavailable Production sync system.

Visual acceptance: compare desktop and Samsung S24 independently; emulated screenshots, if available, must be labeled emulated. Physical S24 cannot be claimed from DOM tests. Record visual differences and remaining checks in PR before handoff.
