# v2.1.9 — Staging deployment status (2026-11-21)

## Cloudflare resources provisioned
- Worker: `tungcnc-quote-inbox-staging`
- Worker URL: `https://tungcnc-quote-inbox-staging.ndtung-pc.workers.dev`
- D1: `tungcnc-quote-inbox-staging` (`4c5f1ba6-592d-43a6-9d7c-b13fe8cd00fa`), APAC
- D1 schema and index created successfully.
- Worker uploaded and workers.dev route enabled.
- `SESSION_SIGNING_KEY` set directly as Cloudflare secret (never committed).
- `INBOX_PASSWORD_SHA256` **NOT set**. API deliberately returns 503 until secure enrollment is configured.
- No production Pages deployment, no changes to existing accounting IndexedDB.

## Blocking tasks before end-to-end acceptance
1. Replace shared-password bootstrap with proper one-time device enrollment and revocation, or configure secure enrollment via Cloudflare dashboard; do not put password/hash in frontend.
2. Add staging origins to explicit Worker allowlist, and configure `TG_QUOTE_INBOX_API` only on test deployments.
3. Confirm Cloudflare Worker route and OPTIONS/CORS, auth, POST/GET/PATCH against D1 with synthetic test quotes.
4. Fix sender/receiver integration issues, validate no double import and retry when remote status marking fails.
5. Test two independently installed Android PWAs; reconcile customer/order/payment counts before production rollout.

## Safety
Do not merge PR #6 or update production before above checks pass. Do not send real customer information to staging.
