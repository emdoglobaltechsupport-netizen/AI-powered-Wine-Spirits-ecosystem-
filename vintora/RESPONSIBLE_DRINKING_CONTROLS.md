# Responsible-Drinking Controls

> **Prototype mode — no real orders are placed. NO-GO for public launch.** The limits below are illustrative design guardrails, not legal determinations. Machine authority: [`config/responsible-drinking-policy.json`](./config/responsible-drinking-policy.json), checked by `npm run responsible-drinking:check`.

Canonical references: [`AI_SAFETY_CONTROLS.md`](./AI_SAFETY_CONTROLS.md), [`MARKETING_EXTERNAL_ACTIONS.md`](./MARKETING_EXTERNAL_ACTIONS.md), [`COMMERCE_SAFEGUARDS.md`](./COMMERCE_SAFEGUARDS.md) and the blocked `responsible-drinking-velocity-controls` record in [`config/high-risk-features.json`](./config/high-risk-features.json).

## 1. Purchase and recommendation limits

| Surface | Prototype guardrail |
|---|---|
| Sommelier / Assist | At most 3 suggestions and 6 bottles per suggestion set; `evaluateResponsibleDrinking()` screens every deterministic answer. |
| Simulated checkout | At most 6 bottles per order, 12 per 24 hours and 24 per 7 days; threshold crossings require human review. |
| Marketing frequency | At most 3 promotional emails per week and 2 promotional pushes per day. |
| Health and excess | Health claims, intoxication encouragement and minor targeting are prohibited by the AI safety and marketing deny lists. |

The deterministic Sommelier adapter calls `detectHarmSignals(query)` and `evaluateResponsibleDrinking()` before returning a reply. Harmful-use language produces a cite-or-abstain refusal, no product ids and a support-resource notice. Age is asserted at the age gate and enforced again by the fail-closed checkout safeguards; no real order, payment or delivery occurs.

## 2. Prohibited targeting and support resources

`deniedAudienceSegments` blocks `underage`, `age_unknown`, `harmful_use_inferred`, `self_excluded`, `recovery_seeking` and `health_adjacent`. Consumption events never feed retargeting. Suppression-list propagation is specified at 24 hours but `suppressionPropagationCompleted` is false.

Every screened customer-facing response carries the responsible-drinking notice. When harmful-use language is detected, the evaluator also requires the support notice: "If alcohol use is a concern, pause and contact a local support service or a healthcare professional." The browser AI guard mirrors the notice so the prototype UI cannot silently drop it.

## 3. Age gating and re-verification

Age verification is required before simulated checkout, with a 720-hour maximum evidence age. Re-verification triggers are `evidence_expired`, `country_changed`, `document_mismatch`, `age_threshold_changed` and `supervisor_override`. `COMMERCE_SAFEGUARDS.md` records the fail-closed checkout implementation; there is no licensed age provider, document check or age-at-delivery proof in this repository.

## 4. Audit and policy review

The evaluator returns an append-only-shaped audit record with correlation id, surface, action, decision, reason code, reason, notice version and timestamp. Event types are `recommendation_screened`, `campaign_screened`, `checkout_limit_checked` and `policy_reviewed`; no production event sink is attached.

A policy review covering minors, addiction/health-sensitive contexts and regional advertising rules is required. Required roles are Compliance Lead, Addiction/Health Adviser and Product Lead. `reviewCompleted` is false and `evidenceRef` is null. No licensed harm classifier, clinical adviser report, measured complaint-rate evidence or regional ad-rule validation exists.

## 5. Verification

`npm run responsible-drinking:check` verifies the register, shared evaluator, Sommelier integration, browser mirror, AI safety policy, high-risk gate and documentation. Shared tests cover limits, harmful-use detection, protected audiences, age expiry and support notices. A green gate proves prototype enforcement only; it is not a safety certification or launch clearance. See [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) and [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md).
