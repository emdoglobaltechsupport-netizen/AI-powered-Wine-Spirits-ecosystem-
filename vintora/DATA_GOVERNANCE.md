# Personal-Data Inventory, Lifecycle and Transfer Controls

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This document specifies controls; it does not certify lawful processing, a completed DPIA or launch approval. Machine authority: [`config/data-governance-policy.json`](./config/data-governance-policy.json), checked by `npm run data-governance:check`.

Canonical references: [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md), [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md), [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) and the blocked `personal-data-lifecycle-governance` record in [`config/high-risk-features.json`](./config/high-risk-features.json).

## 1. Inventory and lawful-basis register

The register inventories 18 data categories across preference, behavioural, transactional, identity, custody, transaction-log, AI-log, marketing-audience and restricted domains. Each purpose/category pair has a `lawfulBasis` record (`consent`, `contract`, `legal_obligation` or `legitimate_interests`), a `design_target` status, an owner role and `evidenceRef: null`. No basis is treated as evidenced until legal review attaches a reference.

| Domain | Categories | Boundary |
|---|---|---|
| Analytics | `catalogue_interactions`, `email_engagement`, `experiment_exposure`, `analytics_identity`, `marketing_audience` | Pseudonymous/first-party; never joined to regulated identity. |
| Commerce | `taste_profile`, `purchase_history`, `age_verified_region`, `transaction_record` | Preference and simulated transaction records; no raw age documents. |
| Regulated | `age_documents`, `regulated_identity`, `kyc_log`, `custody_record` | KYC, AML and custody evidence in a separate system of record; no analytics use. |
| Audit | `ai_interaction_log` | Prompt/model/retrieval metadata for safety audit; no personalization use. |

`health_adjacent`, `precise_location`, `biometric` and `consumption_events` remain restricted and are never used for profiling. `evaluateDataGovernanceUse()` in `@vintora/shared` denies unknown purposes/categories, missing context, unregistered lawful bases, cross-domain joins, identity-domain conflicts, cross-border transfer attempts and internal audit or compliance-hold purposes without attached evidence. Consent-required uses also inherit the deny-by-default decision from `evaluatePersonalDataUse()`.

## 2. Identity separation

Analytics identities are first-party pseudonymous identifiers. Regulated identity records, age documents, KYC logs and custody evidence live in a separate domain with `crossDomainJoinAllowed: false` and `rawIdentityDocumentsInAnalytics: false`. Marketing receives an age-verified region token, not raw identity evidence or age documents. A request declaring a different identity domain than the inventory, or asking for a cross-domain join, is denied before any consent check.

## 3. Deletion, export, opt-out and revocation

| Workflow | Prototype surface | Implemented boundary |
|---|---|---|
| Export | `POST /v1/privacy/export` with `EXPORT_MY_DATA` | Queues a simulated signed manifest; human-reviewed fulfilment, 30-day target. |
| Deletion | `POST /v1/privacy/deletion-request` with `DELETE_MY_DATA` | Queues a reviewed request; legal-hold check and erasure are not executed. |
| Opt-out | `POST /v1/privacy/consents` with `decision: withdraw` | Versioned withdrawal denies use on the next evaluation. |
| Revocation | Same consent endpoint | Propagation to recommendations, marketing, experimentation and audience drafts is required within 24 hours; `propagationCompleted: false`. |

`POST /v1/privacy/data-governance/evaluate` records one advisory decision in the existing append-only privacy audit. It does not export, delete or transfer data.

## 4. Retention

Declared design-target schedules: AI logs 90 days; transaction records 2,555 days; KYC logs 2,190 days; custody records 3,650 days; marketing audiences 180 days; taste profile 90 days; catalogue interactions/experiment exposure 30 days; purchase history 365 days. `retention.enforced` is false, no deletion job exists and the legal-hold model is `required-not-implemented`. Stale collection timestamps are refused by the evaluator, but that is a decision gate, not a retention implementation.

## 5. Cross-border transfer safeguards

`crossBorderTransfer.enabled` is false, `allowedRegions` and `approvedMechanisms` are empty, no transfer impact assessment is completed, no subprocessor is approved and `evidenceRef` is null. Any `crossBorder` descriptor is denied by the evaluator. Production transfer requires a lawful mechanism, completed TIA, processor agreement, regional storage boundary and legal/compliance sign-off. None exists here.

## 6. Verification and evidence gaps

- `npm run data-governance:check` verifies the register, evaluator, API route, shared tests, high-risk gate and documentation stay consistent.
- `npm run ci:verify` includes `data-governance:check`; the API smoke suite exercises the cross-border denial path.

No production consent receipt, processor agreement, signed processing record, retention/deletion job, legal-hold implementation, withdrawal propagation, transfer impact assessment or completed DPIA exists. All reported governance behaviour is Phase 1 metadata parity only. See [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) and [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md).
