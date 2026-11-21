# Vintora age assurance boundary

> **MATURITY: PHASE 1 PROTOTYPE. NO-GO for public launch.**
> **Prototype mode — no real orders are placed.** No licensed age or identity provider is integrated.

This document is the human-readable companion to [`config/age-assurance-policy.json`](./config/age-assurance-policy.json) and [`config/runtime-boundaries.json`](./config/runtime-boundaries.json). It defines where age assurance is required and what evidence a future release must supply. It is not legal advice and does not establish that alcohol sales are lawful anywhere.

## 1. Current enforcement boundary

The prototype uses a local date-of-birth assertion and deterministic simulated safeguards. Before a checkout quote or order, `evaluateCommerceSafeguards()` requires tenant, user and jurisdiction context, fresh age evidence within 720 hours, and five controls (`age`, `kyc`, `aml`, `sanctions`, `payment`) with `simulated:` evidence references no older than 15 minutes. Missing, invalid, stale, future, unknown, denied or blocked-jurisdiction inputs deny the request.

This is fail-closed **for the prototype only**. It is not a licensed age assurance result. Real provider evidence cannot pass the current evaluator; the evidence prefix and policy version must be deliberately changed only after legal, privacy and provider gates are satisfied.

The UI thresholds used by `minimumAgeFor()` are illustrative prototype assumptions. `config/age-assurance-policy.json` records every jurisdiction with `minimumAge: null`, `ruleSourceRef: null` and a deny-until-legal-review decision. No numeric threshold in code is a sourced legal rule.

## 2. Jurisdiction and stage routing

| Stage | Timing | Prototype status | Required future evidence |
|---|---|---|---|
| `account-age-assertion` | Before checkout | `simulated-local` | Signed, jurisdiction-specific provider status |
| `checkout-safeguard` | Before quote and order | `enforced-simulated` | Fresh signed age decision with opaque subject hash |
| `fulfilment-review` | Before release | `not_implemented` | Licensed warehouse and carrier authority evidence |
| `delivery-age-check` | At delivery | `not_implemented` | Jurisdiction-specific age-at-delivery record |

The routing registry currently covers `US`, `GB`, `UNVERIFIED` and `BLOCKED_BY_COUNSEL`. The last two are fixture-only deny labels, not official lists. Any jurisdiction not explicitly reviewed uses `unknownJurisdictionDecision: deny`. Counsel must supply minimum ages, accepted assurance methods, record-retention periods and delivery checks before any code path may treat a jurisdiction as clearable.

## 3. Re-verification and signed evidence

Re-verification is required on:

- `jurisdiction-change`
- `transaction-risk-change`
- `evidence-expiry`
- `provider-or-method-change`

Required evidence fields are `control_id`, `result`, `evidence_ref`, `jurisdiction`, `evaluated_at`, `provider_label`, `subject_hash` and `signature`. A future real adapter must provide a signed status, verify the provider signature and store only the minimum status evidence. Full identity documents must not be copied into commerce records.

## 4. Privacy, accessibility and consumer notice

Age data is sensitive-adjacent. The policy requires granular consent, separation from recommendation/marketing/experimentation purposes, a documented retention schedule and simulated DSAR export/deletion workflows. The privacy register remains blocked and unsigned; retention and DPIA evidence are not obtained.

Consumer notices must be accessible to WCAG 2.2 AA and explain what age signal is collected, why, how long it is retained, how it is withdrawn and how a person can request export or deletion. The current UI notice is a prototype notice, not a reviewed privacy notice.

## 5. Audit events and fraud scenarios

Age decisions write `age_assertion_written` and `commerce_safeguard_decision_written`. A future re-verification path must also write `age_reverification_required`, and fulfilment must write `fulfilment_age_check_required`. These events are append-only local records today, not a centralised retained store.

| Scenario | Expected result | Local coverage |
|---|---|---|
| `underage-dob` | Denied | `services/api/scripts/smoke.mjs` |
| `invalid-dob-format` | Denied | `services/api/scripts/smoke.mjs` |
| `missing-age-evidence` | Denied | `services/api/scripts/smoke.mjs` |
| `denied-jurisdiction` | Denied | `services/api/scripts/smoke.mjs` |
| `stale-age-evidence` | Denied | `packages/shared/src/commerce-safeguards.test.ts` |
| `future-age-evidence` | Denied | `packages/shared/src/commerce-safeguards.test.ts` |

These are deterministic prototype scenarios. No real fraud, chargeback, account-takeover or provider-response test suite has run.

## 6. Evidence gaps and enablement sequence

Before any real age/KYC provider may be enabled, all of the following must exist: distinct Legal and Compliance approvals; sourced jurisdiction rules; provider due diligence and contract; DPIA and retention schedule; signed status verification; minor-rejection and fraud tests; carrier age-at-delivery proof; accessible consumer notice; and an append-only retained audit store. Until then, the adapter stays simulated, real opt-ins stay false, and all commerce orders remain simulated.
