# Vintora Data Retention and Deletion Architecture

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/data-retention-architecture.json`](./config/data-retention-architecture.json); checked by `npm run retention:check`. Schedules are Design targets; no retention job, legal-hold engine or production erasure execution is implemented.

## 1. Architecture principles

- Every personal or regulated data class has an owner, purpose, retention period and deletion behaviour before collection.
- Analytics identity, commerce identity, regulated identity and audit evidence are separated; cross-domain joins fail closed.
- Retention expiry is a deny signal. An expired record cannot support recommendations, marketing, experimentation or model evaluation.
- Legal hold pauses deletion without extending ordinary processing purposes.
- Data that is not collected has a zero-day schedule and a `not collected` system of record.

## 2. Class schedule

The register mirrors all 18 inventory classes in [`config/data-governance-policy.json`](./config/data-governance-policy.json). Representative boundaries:

| Data class | Days | Deletion behaviour |
|---|---:|---|
| `catalogue_interactions`, `experiment_exposure`, `analytics_identity` | 30 | Expire event/cohort records and pseudonymous mappings |
| `taste_profile`, `ai_interaction_log` | 90 | Crypto-shred keys and expire provenance metadata after safety window |
| `marketing_audience`, `email_engagement` | 180 | Remove audience draft and propagate suppression |
| `age_verified_region`, `purchase_history` | 365 / 365 | Expire age token; retain redacted financial proof |
| `age_documents`, `regulated_identity`, `kyc_log` | 2,190 | Human-reviewed regulated destruction after hold check |
| `transaction_record` | 2,555 | Reversing ledger entries retained; PII vault destruction |
| `custody_record` | 3,650 | Non-live blueprint evidence only; no real custody record |
| Health-adjacent, precise-location, biometric and consumption-event data | 0 | Not collected |

Full per-class values are in the machine register. Product architecture context is in [`03-technical-architecture.md`](./03-technical-architecture.md) and [`04-database-design.md`](./04-database-design.md).

## 3. Workflows

| Workflow | Prototype state | Boundary |
|---|---|---|
| Export | simulated-only | `POST /v1/privacy/export`; confirmation `EXPORT_MY_DATA`; 30-day target |
| Deletion | human-reviewed-request-only | `POST /v1/privacy/deletion-request`; confirmation `DELETE_MY_DATA`; hold check required |
| Opt-out | prototype-decision-only | `POST /v1/privacy/consents`; deny on next evaluation |
| Revocation | required-not-executed | 24-hour propagation target to recommendations, marketing, experimentation and audience drafts |

## 4. Enforcement boundary

`retentionJobImplemented`, `cryptoShreddingImplemented` and `externalAuditSink` are false or null. No scheduled retention job, deletion worker, crypto-shredding integration or legal-hold model is implemented. Legal hold is `required-not-implemented`. No approved retention schedule, DPIA, signed processing record, production export, erasure or downstream propagation has been executed. See [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md) and [`REGULATORY_DOCUMENTATION.md`](./REGULATORY_DOCUMENTATION.md).

## 5. Evidence gaps

Green checks verify that this architecture register matches the data inventory. They do not implement or evidence retention, deletion, crypto-shredding or legal-hold behaviour.
