# AI Personalization Privacy and Consent Controls

**Status: NO-GO for production profiling.** The closed-loop AI model is not running. Optional personalization is off by default, and the prototype contains no live model training, production export, irreversible deletion or retention job.

Canonical references: [`config/privacy-consent-policy.json`](./config/privacy-consent-policy.json), [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md), the blocked `ai-personalization-consent` record in [`config/high-risk-features.json`](./config/high-risk-features.json), and [`06-ai-features.md`](./06-ai-features.md) §4.

---

## 1. Data inventory and purpose map

The machine-readable register enumerates every category the prototype may expose to a privacy decision. Data with no approved purpose is never used.

| Category | Sensitivity | Approved purposes | Retention |
|---|---|---|---|
| `taste_profile` | personal | recommendations, closed-loop (disabled) | 90 days |
| `catalogue_interactions` | personal | recommendations, experimentation | 30 days |
| `purchase_history` | personal | closed-loop (disabled) | 365 days |
| `email_engagement` | personal | marketing | 180 days |
| `experiment_exposure` | pseudonymous | experimentation | 30 days |
| `age_verified_region` | personal | marketing | 365 days |
| `consumption_events` | sensitive-adjacent | none | 0 days |
| `age_documents` | restricted | none | 30 days (compliance only) |
| `health_adjacent`, `precise_location`, `biometric` | restricted | none | 0 days |

`consumption_events`, `health_adjacent`, `precise_location`, `biometric` and `age_documents` are never available for profiling, regardless of consent. No health or wellbeing inference is made, and age-verification evidence is used only for the compliance decision.

## 2. Granular consent and privacy-preserving defaults

| Purpose | Default | Consent requirement | Boundary |
|---|---|---|---|
| `recommendations` | off | versioned opt-in (`v1`) | explicit taste/catalogue signals only |
| `closed_loop_personalization` | off | opt-in **and DPIA** | disabled in prototype |
| `marketing` | off | versioned opt-in | engagement and verified region only; separate from recommendations |
| `experimentation` | off | versioned opt-in | exposure and catalogue events only |

`evaluatePersonalDataUse()` in `@vintora/shared` is deny-by-default. It denies unknown purposes/categories, missing context, sensitive data, closed-loop use, stale notices, withdrawn or missing consent, cross-purpose reuse and expired retention. Recommendation, marketing and experimentation data are separate purpose stores; consent for one never authorises another. Withdrawal is as easy as opt-in through the same endpoint and takes effect on the next evaluation.

## 3. Transparent data controls

Authenticated prototype subjects can inspect and change their own consent state; the server derives tenant and subject identity from the session and never trusts client-supplied consent claims.

| Endpoint | Purpose |
|---|---|
| `GET /v1/privacy/controls` | Read the purpose map, data inventory categories, retention schedule, sensitive-data denials and evidence gaps. |
| `GET /v1/privacy/consents` | Read the subject's current versioned consent state. |
| `POST /v1/privacy/consents` | Record an `opt_in` or `withdraw` decision for one purpose. |
| `POST /v1/privacy/data-use/evaluate` | Audition one proposed data use without performing it. |
| `POST /v1/privacy/export` | Queue a signed demo manifest with explicit `EXPORT_MY_DATA` confirmation. |
| `POST /v1/privacy/deletion-request` | Queue a human-reviewed deletion request with explicit `DELETE_MY_DATA` confirmation. |
| `GET /v1/privacy/audit` | Read the subject's append-only decision and consent audit. |

Every decision is written to `privacy_decision_audit` with correlation ID, tenant, subject, purpose, data category, action, decision, reason code, reason and timestamp. Update/delete triggers reject mutation and row-level security is forced.

## 4. Retention and DPIA posture

Retention periods are declared per purpose (30–365 days). `retention.enforced` is false and no deletion job exists; the evaluator will refuse stale data if a collection timestamp is supplied, but that is not a production retention control. A DPIA is required before closed-loop personalization, real age/KYC data, systematic profiling at scale or any sensitive-category processing. No DPIA has been completed and no closed-loop model is active.

## 5. Verification and evidence gaps

- `npm run privacy:check` verifies the register, evaluator, migration, API surface, high-risk gate and documentation stay consistent.
- `npm run data-governance:check` extends this control plane with the 18-category inventory, lawful-basis register, analytics/regulated identity separation, lifecycle workflows, retention targets and cross-border transfer block documented in [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md).
- `npm run ci:verify` includes both checks; shared tests cover defaults, purpose separation, sensitive data, withdrawal, stale notices, closed-loop denial, retention expiry, lawful bases and transfer/join denial.

No production consent receipt, withdrawal propagation to downstream processors, WORM audit retention, verified DSAR fulfilment, crypto-shredding, retention job, legal-hold model, signed processing record or completed DPIA exists. Export is a simulated manifest and deletion is a reviewed request only. All profile and personalization outputs in the UI are deterministic demo data. See [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) and [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md).
