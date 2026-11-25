# Tổng quan V1.1 — Preview only
Base Production92f0ef2477f84deee38057c406e01e2c7dc7e686, not unmerged Dark V1. Branch fix/overview-v1.1-preview. Other app files retained from Production.

Changes: existing TG icon in header, existing customer search/quote inbox/live sync controls, dynamic version subtitle. Existing four navigation targets and statistic markup, handlers, formulas and CSS unchanged. Render keeps only first3 recent rows without changing chronology helper/default5 or debt. Existing two quick buttons replaced by four neutral equal buttons below recent: existing create menu, supplier form, multi-order receipt, debt center. Light uses existing theme surfaces.

Version metadata/app constant aligned to actual released2.4.1 from stale2.3.0; prevents repeated update notice. Exact Preview hostname added only to existing isolated UI route; no API/Cloud target/allowlist changes, real Preview sync status is disconnected.

Focused test: node sync/tests/overview-v11.cjs PASS — metrics1.450.000/1/50.000/600.000 unchanged, three of five original recent rows in original order, nav4/header3/unique notification counter, logo asset, neutral quick positions/routes, live sync busy/synced, no state changes, no Dark V1 asset/stat CSS. No full old suite rerun.

Required handoff: Cloudflare commit verification, desktop Dark/Light screenshots, explicit S24 physical status. No test data imported into Production; use local marked fixture only. No schema/Worker/auth/sync/accounting/reminder modifications. Do not merge or release until owner approves.
