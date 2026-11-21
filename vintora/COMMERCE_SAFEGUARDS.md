# Vintora Commerce Safeguards — Simulated Enforcement Boundary

> **MATURITY: PHASE 1 PROTOTYPE. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.** All screening and payment decisions described here are simulated.

This document records the enforced checkout boundary for age assurance, KYC, AML, sanctions/PEP and payment authorisation. The machine-readable authority is [`config/commerce-safeguards.json`](./config/commerce-safeguards.json), checked by `npm run safeguards:check`. The pure evaluator lives in `packages/shared/src/commerce-safeguards.ts`; the API adapter and append-only evidence live under `services/api/src/modules/commerce/`.

## 1. What is enforced in the prototype

Every `/v1/checkout/quote` and `/v1/checkout/orders` request passes through `evaluateCheckoutSafeguards()` after authentication, commerce permission and age preconditions. The evaluator is fail-closed: a missing, unknown, stale, future-dated, denied or incorrectly labelled decision blocks the request.

| Control | Prototype adapter | Enforced check | Real-world gap |
|---|---|---|---|
| Age | Local date-of-birth assertion in the database | Verified status, country, timestamp, 720-hour maximum evidence age | No certified provider, document check or age-at-delivery proof |
| KYC | Deterministic local decision | Required `simulated:kyc:<hash>` evidence, freshness and allowed result | No licensed identity provider |
| AML | Deterministic local transaction decision | Required `simulated:aml:<hash>` evidence, freshness and allowed result | No transaction-monitoring case or suspicious-activity workflow |
| Sanctions / PEP | Deterministic local list fixture | Required `simulated:sanctions:<hash>` evidence; denied fixture jurisdictions and non-clear results block | `UNVERIFIED` and `BLOCKED_BY_COUNSEL` are fixture labels, not official lists |
| Payment | `PaymentAuthorizationAdapter`, implemented only by `simulatedPaymentAdapter` | Required `simulated:payment:<hash>` evidence; any non-`simulated` provider returns `unknown` and blocks | No PSP, PCI scope, capture confirmation or settlement feed |

Decision freshness is capped at 15 minutes for screening evidence and 720 hours for the underlying verified-age assertion. Evidence references are opaque hashes prefixed with `simulated:`; they are not provider responses.

## 2. API surface

- `GET /v1/commerce/safeguards/controls` — authenticated, read-only control register.
- `POST /v1/commerce/safeguards/evaluate` — authenticated fail-closed evaluation. An optional `jurisdiction` may be used to exercise the fixture deny list.
- Checkout quote and order routes call the same evaluator before any quote, stock mutation or simulated order row is produced.

Each evaluation appends one row per control to `commerce_safeguard_decisions`. The table is tenant-isolated, subject-restricted with a `RESTRICTIVE` RLS policy and protected by an append-only trigger. No real personal data, government ID, PAN or CVV is stored.

## 3. Why this is not launch approval

The controls prove that the prototype cannot silently proceed when a control is missing or denied. They do **not** prove regulatory, provider or payment readiness. No official sanctions, PEP or AML list is consulted; no payment is authorised; no KYC or age document is validated. Legal and Compliance sign-offs remain absent in [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md), and public launch remains disabled in [`config/launch-manifest.json`](./config/launch-manifest.json).

`npm run safeguards:check` and the smoke suite verify machine-enforced prototype behaviour only. A green run is **Phase 1 gates only**, never a launch permission.
