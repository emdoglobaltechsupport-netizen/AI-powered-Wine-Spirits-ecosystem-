# AI-Generated Marketing Release Controls

**Status: NO-GO for live campaign release.** Vintora Studio and AI Marketing Automation generate deterministic drafts only. No ad platform, budget API, email sender, audience feed or production approval record is connected.

Canonical references: [`config/marketing-release-policy.json`](./config/marketing-release-policy.json), [`23-ai-marketing-automation-module.md`](./23-ai-marketing-automation-module.md), [`14-ai-content-generator-module.md`](./14-ai-content-generator-module.md), and the blocked `ai-marketing-human-release` and `ad-spend-marketing-automation` records in [`config/high-risk-features.json`](./config/high-risk-features.json).

---

## 1. Mandatory approval gateway

`MARKETING_RELEASE_ENABLED = false` and every campaign action begins as a `draft`. `evaluateMarketingRelease()` in `@vintora/shared` records a decision but never publishes, spends or sends. Release and positive budget changes are denied even when a named approver, reasons, fact packets and alcohol-validation evidence are supplied. Pause and rollback are simulated controls with reason and distinct-approver requirements; they do not change live campaigns.

Admin evaluation requires an active Admin role, live time-boxed elevation and `admin:*:internal`. Approver codes (`growth_ops`, `ai_ops`, `auditor`) are resolved to active named users by the server, and self-approval is rejected.

## 2. Audience and claim deny lists

| Control | Enforced rule |
|---|---|
| Restricted geographies | `UNVERIFIED`, `SANCTIONED` and `BLOCKED_BY_COUNSEL` are denied. |
| Restricted audiences | `underage`, `age_unknown`, `health_adjacent`, `recovery_seeking` and `sensitive_category` are denied. |
| Minor targeting | Never allowed; retargeting requires a separate consent purpose and is not enabled here. |
| Prohibited claims | Health, medical, "safe drinking", guaranteed, investment return, cure, unverified award and unverified price patterns are blocked. |
| Evidence-backed claims | Price, award, provenance and comparative claims require versioned evidence references. |
| Alcohol advertising | Release requires completed, passed jurisdiction validation and counsel review. |

The evaluator compares normalised values and denies unknown actions, missing context and incomplete provenance before any advisory output is accepted.

## 3. Budget and spend controls

Advertising is capped at **8% of revenue** as a canonical design constraint, enforced outside the model. The prototype evaluator sets `maxIncreasePercent = 0`; any positive budget increase is blocked. No autonomous spend, bid, platform submission or email send exists. Unusual spend variance ≥20% or performance shift ≥30% sets `requiresAlert` in the decision and is stored in the append-only audit.

## 4. Provenance, audit and rollback

Required provenance fields are `campaignId`, `createdBy`, `promptHash`, `evidenceRefs`, `modelOrAdapter`, `reviewedAt` and `version`. Each evaluation appends to `marketing_release_audit` with correlation ID, tenant, actor, campaign, action, decision, reason code, reason, alert flag and timestamp; update/delete triggers reject mutation and row-level security is forced. `marketing_campaign_controls` records only simulated `draft`, `paused` or `rolled_back` state; no `live` state can be created through the API.

| Endpoint | Purpose |
|---|---|
| `GET /v1/admin/marketing/controls` | Read the release posture, deny lists, budget controls, provenance fields and alert thresholds. |
| `GET /v1/admin/marketing/audit?limit=100` | Read recent immutable campaign decisions. |
| `POST /v1/admin/marketing/campaigns/evaluate` | Evaluate `draft`, `release`, `pause`, `rollback` or `budget_increase`; advisory only, no live effects. |

## 5. Verification and evidence gaps

- `npm run marketing:check` verifies the policy register, shared evaluator, migration, API surface, high-risk gates and documentation stay consistent.
- `npm run external-actions:check` verifies the sandbox-only channel cap, recorded approver/prompt/model/payload fields, rendered preview, audience verification, budget owner, legal approval and kill switch in [`MARKETING_EXTERNAL_ACTIONS.md`](./MARKETING_EXTERNAL_ACTIONS.md).
- `npm run responsible-drinking:check` verifies that campaign screens deny harmful-use and protected audiences and carry support guidance; see [`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md).
- `npm run ci:verify` includes all three checks; shared tests cover provenance, restricted audiences/geographies/claims, release blocking, distinct approval, budget blocking, anomaly alerts and sandbox external-action gates.

No production immutable audit store, alerting pipeline, ad-platform connector, jurisdiction-specific counsel service, measured spend-cap enforcement, canary/rollback execution or human-release token exists. Campaign metrics, budgets, approvals, segments and creatives in the prototype are deterministic demo values. See [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) and [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md).
