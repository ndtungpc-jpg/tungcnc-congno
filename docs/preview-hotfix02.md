# Preview Hotfix 02

Scope: create-order chooser, multi-order receipt customer lookup, and dashboard quick-action theme colors only. No API/Worker/auth/sync/schema changes.

The chooser delegates to existing quick/detailed forms. Receipt lookup preserves the original ID select and original allocation/save commands. Searching or switching customers clears unsaved amount/allocation; duplicate names remain separate IDs. All affected surfaces use existing theme tokens. Visual viewport resize limits the independently scrolling suggestions and receipt dialog.

Focused automated validation: `node sync/tests/preview-hotfix02.cjs` and `node sync/tests/overview-v11.cjs` PASS. Covers accent/case/phone search, missing matches, duplicate names, clearing, customer switching, profile preselection, invalid selection guard, original two-order payment grouping/total/debt, unchanged state before save, original quick/detailed forms and dashboard routes/metrics.

Browser review and S24 hardware/Android keyboard acceptance are tracked separately; no physical Android test is implied by desktop browser or automated checks. Preview remains isolated/local-only; no Production data or backend configuration is changed.
