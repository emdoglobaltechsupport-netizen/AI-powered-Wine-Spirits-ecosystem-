# Vintora Legal & Compliance Sign-off Gate for High-Risk Features

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed. No high-risk feature is active in the prototype.** Every feature in the register below has status `blocked`, and no legal or compliance sign-off has been granted.

## Canon snapshot

| Fact | Value |
|---|---|
| Tagline | *The World's Cellar, Intelligent.* |
| Market-facing modules | Exactly ten: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards |
| Internal layers | Admin Panel (19 workspaces), Global Payments, AI Marketing Automation, Ultimate AI TechOps (24 agents in `ADM-19`) |
| Guardrails | Four-eyes with distinct approver, reason-bearing elevation, time-boxed break-glass, append-only audit, advertising ≤ 8% of revenue, AI kill-switch < 1 min design SLO |
| Production safeguard | `NODE_ENV=production` rejected at startup |

---

## 1. Purpose and authority

This document defines the activation gate for any feature that touches money, alcohol regulation, identity, custody, privacy-sensitive data, marketing spend or autonomous AI action. The machine-readable authority is [`config/high-risk-features.json`](./config/high-risk-features.json), checked by `npm run gates:check`. Each record carries `id`, `name`, `risk`, `status`, `owner`, `legalSignoff`, `complianceSignoff` and `activationGates[]`.

A sign-off is permission to *begin controlled activation*, never permission to skip `LAUNCH_READINESS.md`, [`DISCLAIMER.md`](./DISCLAIMER.md) or [`FEATURE_STATUS.md`](./FEATURE_STATUS.md). No sign-off may assert a real provider relationship, licence or legal opinion that has not been obtained and evidenced.

## 1A. Separate public-launch and commercial-licence gate

`npm run gates:check` proves only that high-risk records remain blocked and unsigned; it never grants launch permission. The separate fail-closed authorities are:

- [`config/launch-manifest.json`](./config/launch-manifest.json): `publicLaunch: false`, no enabled high-risk features, no licence evidence references, null Legal/Compliance approvers and null guard-removal approval.
- [`config/commercial-licensing-policy.json`](./config/commercial-licensing-policy.json): six required domains (alcohol retail, fulfilment, tax, payment processing, custody/investment and distribution), all `not_obtained` with null evidence references.
- `npm run launch:check`: fails if any of those records asserts an approval or evidence reference the repository does not contain.

To change this gate, a PR must attach distinct named Legal and Compliance approvers, stable evidence references for every required licence, and an approved production-guard removal record. `licenses:check` remains an npm SPDX policy only; it is not commercial, alcohol, custody or tax licensing evidence. A green CI run remains **Phase 1 gates only**.

---

## 2. High-risk feature register

IDs and names below mirror the expected `id`/`name` values in `config/high-risk-features.json`; the JSON file is authoritative if a value differs, and both must be updated in the same PR. `null` means no sign-off record exists. All `status` values are `blocked`; all `legalSignoff` and `complianceSignoff` values are `null`.

| id | Feature name | Risk class | Status | Owner role | legalSignoff | complianceSignoff | Activation gates (summary) |
|---|---|---|---|---|---|---|---|
| `live-payments` | Live payments | Financial / PCI | `blocked` | Payments Lead | `null` | `null` | Licensed PSP, PCI scope, ledger, reconciliation, secrets scan |
| `age-kyc` | Age assurance / KYC | Identity / regulatory | `blocked` | Compliance/Legal reviewer | `null` | `null` | Certified provider, jurisdiction rules, DPIA, counsel |
| `alcohol-fulfilment` | Alcohol fulfilment | Regulatory | `blocked` | Operations / Compliance Lead | `null` | `null` | Licences per jurisdiction, carrier authority, age-at-delivery, tax |
| `tax` | Tax calculation and filing | Financial / regulatory | `blocked` | Finance / Tax Lead | `null` | `null` | Registered rates, tested engine, effective date, counsel |
| `ad-spend-marketing-automation` | Ad spend / marketing automation | Financial / advertising | `blocked` | CMO / Growth lead | `null` | `null` | ≤8% cap enforcement, human publish approval, ad-rule review |
| `ai-publishing` | AI publishing of customer-facing content | Reputational / regulatory | `blocked` | Chief AI Officer / Product lead | `null` | `null` | Eval gates, FACT_PACKET grounding, human approval, kill-switch drill |
| `vault-custody` | Vault custody / fractional ownership | Financial promotion / custody | `blocked` | Vault / Investment Product lead | `null` | `null` | Licensed custodian, legal opinions, investor protections, risk disclosure |
| `africa-country-activation` | Africa country activation | Regulatory / market access | `blocked` | Global Beverage Marketplace Strategist | `null` | `null` | Per-country licence, payments, tax, language, local counsel |
| `privacy-sensitive-data-processing` | Privacy-sensitive data processing | Privacy | `blocked` | Data Protection / Privacy lead | `null` | `null` | DPIA, lawful basis, DSAR, retention, RLS, purpose limitation |
| `refunds-disputes` | Refunds and disputes | Financial | `blocked` | Finance / Support Lead | `null` | `null` | State machines, evidence pack, deadlines, distinct approvers |
| `pricing-promotions` | Automated pricing and promotions | Financial / fairness | `blocked` | Pricing / Product lead | `null` | `null` | Seller approval, fairness checks, no personal pricing, ADR/audit |
| `ai-agent-autonomy` | Internal AI agent tool execution and autonomy | AI / operational / data exfiltration | `blocked` | CTO / AI Ops Lead | `null` | `null` | Tool allowlist, distinct approval, credential/network isolation, injection defence, append-only audit, independent kill-switch drill, sandbox/canary/replay, high-impact review |
| `ai-personalization-consent` | AI personalization and customer profiling | Privacy / profiling / fairness | `blocked` | Data Protection / Product lead | `null` | `null` | Data inventory/purpose map, granular opt-in, sensitive-data minimization, purpose separation, export/deletion, enforced retention, privacy defaults, DPIA |
| `ai-marketing-human-release` | AI-generated marketing and campaign release | Advertising / regulatory / financial | `blocked` | CMO / Growth lead | `null` | `null` | Human approval gateway, geography/age deny lists, alcohol-ad validation, budget authorization, immutable provenance/audit, pause/rollback, spend/performance alerts |

---

## 3. Required evidence by feature

| Feature family | Minimum evidence before `legal_review` |
|---|---|
| Payments, refunds, disputes, tax | PSP/counsel documentation, PCI scope assessment, ledger design, reconciliation and dispute drill results, tested rate tables, segregation-of-duties matrix from `FINANCIAL_CONTROLS.md`. |
| Age/KYC, fulfilment, country activation | Licensed provider evidence, per-jurisdiction counsel opinion, licence/permit references, age-at-delivery procedure, tax registration, local-language consumer copy. |
| Ad spend, AI publishing, pricing/promotions | Eval report, grounded content samples, human-approval workflow, ≤8% cap control, fairness/brand-safety review, kill-switch drill, ADR for architecture. |
| Vault custody | Custodian licence, segregation and title legal opinion, investor-risk disclosures, fee schedule traceable to canon, no guaranteed-return language. |
| Privacy-sensitive processing | DPIA, processing record with lawful basis, consent/DSAR/retention procedures, RLS test results, redaction evidence, AI/analytics privacy review. |
| Internal agent autonomy | [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md), `npm run agents:check`, per-agent allowlist and approval records, timed `< 1 min` kill-switch drill, injection red-team, sandbox/canary/replay and high-impact tool review. |
| AI personalization and profiling | [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md), `npm run privacy:check`, signed field inventory/purpose map, consent receipts and withdrawal propagation, sensitive-data exclusion, DSAR drill, retention enforcement and completed DPIA. |
| AI-generated marketing release | [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md), `npm run marketing:check`, distinct human-release record, geography/age deny-list evidence, jurisdiction alcohol-ad validation, ≤8% cap proof, immutable audit, rollback drill and anomaly alerting. |

Every evidence item must have a stable reference (document path, record ID or test artifact ID). Candidate market sources are **not** evidence; see [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md).

---

## 4. Sign-off record fields

A feature may leave `approved` only when all fields below are complete. No field may contain a real secret, raw PAN/CVV, government ID or unnecessary personal data.

| Field | Requirement |
|---|---|
| `featureId` | Exact `id` from `config/high-risk-features.json`. |
| `approverName` / `approverRole` | Named human and their role for the activation request (the feature owner). |
| `legalApproverName` / `legalApproverRole` | Named legal approver; must be distinct from the owner and from the compliance approver. |
| `complianceApproverName` / `complianceApproverRole` | Named compliance approver; must be distinct from the owner and from the legal approver. |
| `date` | Decision date (`YYYY-MM-DD`) plus UTC timestamp in the audit record. |
| `evidenceReference` | Stable reference to the evidence pack in §3; no placeholder or fabricated citation. |
| `scope` | Exact feature surface, jurisdictions, locales, customer cohort, capped limits and enabled adapter. |
| `expiryReviewDate` | Mandatory review/expiry date; approval is never open-ended. |
| `rollbackPlan` | Feature-flag key, rollback owner, rollback trigger, expected rollback time and data-handling steps. |
| `activationGates[]` | Every gate in the config record marked satisfied with evidence, or the request cannot proceed. |
| `decision` | `approved`, `denied` or `expired`, with reason and dissenting notes recorded. |

**Segregation rule:** a person may not approve their own request. The owner, legal approver and compliance approver are three different people. This mirrors the four-eyes rule in [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) and the maker/checker rules in `FINANCIAL_CONTROLS.md`.

---

## 5. Workflow states

```text
draft → evidence → legal_review → compliance_review → approved → activated → monitored
              ↘ denied                     ↘ denied                    ↘ expired
```

| State | Entry condition | Actor | Exit |
|---|---|---|---|
| `draft` | RFC/registration opened with owner and scope | Feature owner | Submit evidence pack |
| `evidence` | Evidence pack and `activationGates[]` mapped | Feature owner + Release Manager | Complete checks (`npm run gates:check`, `npm run secrets:scan`) |
| `legal_review` | Evidence complete, legal approver assigned | Legal approver | `approved`-for-legal or `denied` |
| `compliance_review` | Legal approval recorded by a distinct person | Compliance approver | `approved` or `denied` |
| `approved` | All §4 fields complete; scoped and time-bound | Canon Steward consistency check | Deployment approval, then `activated` |
| `activated` | Feature flag enabled only in the approved scope | Release Manager | Monitor; auto-move to `monitored` |
| `monitored` | Live only within approved scope and expiry | Owner + Compliance reviewer | Renew, suspend or `expired` |
| `denied` / `expired` | Gate failed or review date passed | Compliance/Legal reviewer | New RFC for any re-attempt; no silent reactivation |

---

## 6. Enforcement points

| Enforcement | Mechanism | Verification |
|---|---|---|
| Code feature flag | No high-risk behaviour compiles or routes without an explicit flag; default is off. | Code review; flag-default test in `npm run test:shared`. |
| Config validation | `config/high-risk-features.json` requires sign-off fields for any non-`blocked` status. | `npm run gates:check` — fails on missing/distinct approvals or open gates. |
| Launch gate | `config/launch-manifest.json` and `config/commercial-licensing-policy.json` remain false/null/unobtained. | `npm run launch:check` — fails on unevidenced approval or licence claims. |
| CI gate | Typecheck/tests, secret scan and gate check run on every PR; red check blocks merge. | CI workflows + `npm run ci:verify`, `npm run secrets:scan`, gitleaks. |
| Deployment approval | Release Manager confirms approved scope, expiry date and rollback plan; `NODE_ENV=production` guard remains until launch gates close. | Release record with approver roles. |
| Admin console | ADM-01…ADM-19 exposes activation state read-only unless the operator has an approved, non-expired role; T3/T4 actions need reason and distinct approver. | Admin audit rows; count-only coverage; browser self-test. |
| API boundary | `API_POLICY.md` requires 428 `precondition_required` for missing age/KYC/elevation and safe errors with `requestId`. | `npm run test:smoke`. |

---

## 7. Emergency and time-boxed exceptions

| Rule | Requirement |
|---|---|
| Maximum duration | **72 hours** from approval; no renewal by silence. |
| Approver | One named approver with authority in the relevant role, explicitly recorded as an exception; not the feature owner. The next business day, a distinct legal **and** compliance reviewer must ratify or revoke. |
| Evidence | Same evidence pack as a normal activation; an exception cannot waive licensed-provider, counsel or DPIA requirements. |
| Scope | Narrowest possible cohort, jurisdiction and capped limits; no expansion without a new exception. |
| Auto-expiry | Feature flag reverts to off at expiry without human action; `npm run gates:check` must fail if expiry has passed. |
| Review | Post-exception review within five business days: outcome, incidents, evidence gaps and follow-up RFC. |
| Audit | Full-width break-glass banner in Admin, reason, approver, timestamps and append-only audit entry. |

No exception may enable live orders/payments, real alcohol fulfilment, real custody or public AI publishing while the production startup guard is active.

---

## 8. Audit requirements

- Every state transition writes an append-only audit record: feature ID, from/to state, actor role, timestamp, evidence reference, scope, decision and reason.
- Audit records use hashes/redacted snapshots per `API_POLICY.md`; never store credentials, raw card data, government IDs or sensitive personal data in sign-off records.
- Evidence packs are versioned and retained per the applicable jurisdiction; financial evidence follows `FINANCIAL_CONTROLS.md`.
- Audit exports require role-based access and are themselves audited; `npm run secrets:scan` and CI gitleaks run before any export is published.
- Missed expiry, missing evidence or mismatched approvers are audit findings that block the next release.

---

## 9. Governance references

- [`config/high-risk-features.json`](./config/high-risk-features.json) + `npm run gates:check` — machine-readable register and gate.
- [`config/launch-manifest.json`](./config/launch-manifest.json), [`config/commercial-licensing-policy.json`](./config/commercial-licensing-policy.json) + `npm run launch:check` — separate launch and commercial-licence gate.
- [`config/catalogue-provenance.json`](./config/catalogue-provenance.json) + `npm run catalogue:provenance:check` — demo/verified catalogue boundary.
- [`config/commerce-safeguards.json`](./config/commerce-safeguards.json) + `npm run safeguards:check` — fail-closed simulated checkout controls.
- [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md), [`MARKETING_EXTERNAL_ACTIONS.md`](./MARKETING_EXTERNAL_ACTIONS.md) and [`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md) — new blocked high-risk registers for lifecycle governance, external marketing execution and velocity/targeting controls.
- [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md) — ledger, reconciliation, refunds, disputes and segregation of duties.
- [`API_POLICY.md`](./API_POLICY.md) — auth, idempotency, audit fields, safe errors, precondition semantics.
- [`adr/`](./adr/README.md) — ADR-0002 payments, ADR-0003 AI, ADR-0004 custody, ADR-0005 agent boundaries.
- [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md), [`DISCLAIMER.md`](./DISCLAIMER.md), [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) — NO-GO posture and launch gates.
- [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md), [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md), [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md), [`ROADMAP.md`](./ROADMAP.md), [`SECURITY.md`](./SECURITY.md).
