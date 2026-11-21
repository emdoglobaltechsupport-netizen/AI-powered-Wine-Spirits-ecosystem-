# Vintora Canon Governance

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE GOVERNANCE. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.** Governance in this document protects the canonical product definition; it does not act as launch approval.

## Canon snapshot

| Fact | Value |
|---|---|
| Tagline | *The World's Cellar, Intelligent.* |
| Market-facing modules | Exactly ten: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards |
| Internal layers | Admin Panel, Global Payments, AI Marketing Automation, Ultimate AI TechOps |
| Internal inventory | 19 Admin workspaces (`ADM-01`…`ADM-19`); 24 TechOps agents in `ADM-19` |
| Scale targets | 100M users, 10M SKU target, 200+ countries, 1.2M orders/day peak, p95 < 200 ms, 99.99% availability |
| Release posture | NO-GO until every gate in `LAUNCH_READINESS.md` is evidenced |

---

## 1. Authority and scope

1. [`_canon.md`](./_canon.md) is the single source of truth for brand facts, module names, numbers and timeline. No other document may redefine them.
2. Derived docs (deliverables 01–27, `README.md`, `FEATURE_STATUS.md`, `ROADMAP.md`, governance docs, UI copy and API docs) must stay aligned with the canon after every change.
3. ADRs record *why* architectural choices were made. An ADR is not a canon amendment and never overrides `DISCLAIMER.md` or `FEATURE_STATUS.md`.
4. Machine registers are authoritative for their domain: [`config/market-forecasts.json`](./config/market-forecasts.json) (`npm run forecasts:check`), [`config/high-risk-features.json`](./config/high-risk-features.json) (`npm run gates:check`) and [`config/agent-autonomy-policy.json`](./config/agent-autonomy-policy.json) (`npm run agents:check`).
5. No role in this document is a named individual. Approvals are recorded by **role plus the named person filling that role at the time** in the change record; roles are never personal property.

---

## 2. Role-based ownership

| Role | Accountability | Cannot do |
|---|---|---|
| **Canon Steward** (founder/product lead) | Accountable for the canon; owns the RFC intake, canonical wording, versioned changelog and final consistency check across docs. | Approve their own change as the distinct approver; waive the NO-GO posture alone. |
| **Architecture Review Board (ARB)** | Reviews architectural impact: services, data, API, tenancy, AI boundaries, performance and operational feasibility. | Change market-facing module/inventory facts or legal claims without Canon Steward approval. |
| **Compliance/Legal reviewer** | Reviews regulated claims, alcohol/advertising/privacy/financial-promotion language and high-risk feature evidence. | Approve a change whose evidence is missing or whose owner is themselves. |
| **Release Manager** | Runs verification commands, prepares release notes/migration notes, confirms CI green and controls the release branch. | Merge a canon change with failing checks or missing approvals. |
| **Forecast owner / Domain owner** | Maintains a specific register record or module area; supplies evidence and impact notes for the RFC. | Self-approve their own record or promote confidence without evidence. |

---

## 3. Immutable in the prototype

The following are invariants of the Phase 1 prototype. A change request cannot alter them; only a separately evidenced launch decision can, and not before `LAUNCH_READINESS.md` gates close.

| Invariant | Current value | Enforcement |
|---|---|---|
| Tagline | *The World's Cellar, Intelligent.* | Canon test + doc/UI string scan |
| Market-facing modules | Exactly ten, with canonical names | Canon tests in `npm run test:shared`; ten-module navigation check |
| Admin workspaces | Exactly 19 (`ADM-01`…`ADM-19`) | Admin coverage test; browser self-test |
| TechOps agents | 24 agents inside internal `ADM-19` | Agent-boundary ADR-0005; role test preventing module/workspace creation |
| Internal layers | Admin, Payments, Marketing Automation, TechOps are not market-facing modules | Canon tests; README/deliverable notes |
| Launch posture | NO-GO; `NODE_ENV=production` rejected at startup; no real orders/payments | Startup guard, CI, `FEATURE_STATUS.md` |
| Claims posture | No real provider, licence, traction, audit or primary-source claim | `DISCLAIMER.md`, `MARKET_FORECAST_PROVENANCE.md`, `npm run forecasts:check` |

---

## 4. Canon change request (RFC) process

| Step | Action | Required artifact |
|---|---|---|
| 1 | Submit an RFC: proposed wording, rationale, affected canon lines and desired effective phase. | RFC entry in the change log with a unique ID. |
| 2 | Impact assessment across ten modules, canon tests, API contract, docs, UI copy and legal claims (matrix below). | Completed impact matrix; no blank cells. |
| 3 | Four-eyes approval: Canon Steward + a **distinct** approver; add Compliance/Legal reviewer for regulated claims and ARB for architecture. | Recorded approvals with roles, dates and scope. |
| 4 | Implement in one PR: update `_canon.md` and every derived doc, config register, UI string and test expectation together. | Single PR with linked RFC; no follow-up "docs later" commit. |
| 5 | Version the changelog: semantic version bump of the canon, date, summary and rollback reference. | Versioned changelog entry. |
| 6 | Verify locally and in CI: `npm run test:shared` (canon tests), `npm run ci:verify`, plus `npm run forecasts:check` / `npm run gates:check` / `npm run agents:check` / `npm run secrets:scan` when registers, agent controls or high-risk features are touched. | Green command output attached to the PR. |
| 7 | Record an ADR if architecture changed; publish a migration note if user-visible behaviour, API fields, localization or data shape changed. | ADR file or migration note linked from the RFC. |
| 8 | Release Manager confirms merge only after steps 3–7; update `FEATURE_STATUS.md` and `ROADMAP.md` if readiness changed. | Release note and status matrix update. |
| 9 | Rejection or rollback: rejected RFCs are closed with reasons; shipped changes are reverted by a new RFC that restores the prior canon version and re-runs steps 4–8. | Closure/rollback entry; never silent deletion of history. |

**Distinct approver rule:** the RFC author, the Canon Steward (when they authored it) and the domain owner may not be the distinguishing approver. Legal and compliance approvers must also be distinct from the feature owner and from each other (see `LEGAL_COMPLIANCE_SIGNOFF.md`).

---

## 5. Impact assessment matrix

| Area | Question to answer | Owner role |
|---|---|---|
| Ten market-facing modules | Does a module name, count, audience or one-liner change? Does navigation still expose exactly ten? | Canon Steward |
| Internal layers / inventory | Are workspaces still 19 and agents still 24 inside `ADM-19`? | ARB |
| Canon tests | Which assertions in `npm run test:shared` change? Are new invariants added? | Release Manager |
| API/schema | Any new/renamed field, enum, route or migration? Check `API_POLICY.md` compatibility rules. | ARB |
| Docs/UI copy | Which of deliverables 01–27, governance docs, labels and localization strings need edits? | Canon Steward |
| Legal/regulatory claims | Does the change imply a licence, provider, audit, performance or financial claim? | Compliance/Legal reviewer |
| Forecast/config registers | Are values, evidence status, confidence or gate records updated in the same PR? | Forecast/domain owner |
| NO-GO posture | Does the change touch a feature in `config/high-risk-features.json` or a production safeguard? | Compliance/Legal reviewer + Release Manager |

---

## 6. Approval matrix

| Change type | Required approvers | Additional evidence |
|---|---|---|
| Editorial/wording, no fact change | Canon Steward + distinct approver | Diff review |
| Numeric or timeline change | Canon Steward + distinct approver + CFO/Finance lead for financial figures | `config/market-forecasts.json` update; `npm run forecasts:check` |
| API/schema or architecture change | Canon Steward + ARB + Release Manager | ADR; `npm run test:shared`; `npm run ci:verify` |
| Regulated/legal claim or privacy change | Canon Steward + Compliance/Legal reviewer + distinct approver | Review record; DPIA where triggered; [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md) / [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md) and `npm run privacy:check` / `npm run marketing:check` where applicable |
| Investor, roadmap and readiness claims (`INVESTOR_DOCUMENTATION.md`, `ROADMAP.md`, deliverables 01, 02, 07, 09, 10 and external investor artifacts) | Canon Steward + distinct approver + Compliance/Legal reviewer; CFO/Finance lead for financial figures | RFC/CCR ID, diff review and green `npm run claims:check` plus `npm run claims-change:check` before publication; the four maturity states and module/environment register in `config/implementation-status.json` must stay aligned |
| High-risk feature activation | Full gate in `LEGAL_COMPLIANCE_SIGNOFF.md` | `npm run gates:check`; signed activation record |
| Module/workspace/agent inventory or NO-GO posture | **Not permitted via RFC** | Requires evidenced launch decision; `LAUNCH_READINESS.md` |

---

## 7. Change record template

| Field | Value |
|---|---|
| RFC ID | `CCR-YYYY-NNN` |
| Date opened / date decided | `YYYY-MM-DD` / `YYYY-MM-DD` |
| Canon version before → after | `v0.x` → `v0.y` |
| Author (role) | e.g. Canon Steward |
| Distinct approver (role) | e.g. ARB chair — not the author |
| Compliance/Legal reviewer (role, if applicable) | e.g. Compliance/Legal reviewer |
| Summary of change | One paragraph, exact wording |
| Impact matrix result | Link or table reference from §5 |
| Affected files | `_canon.md`; deliverables 01–27; config registers; UI/API files |
| Verification commands | `npm run test:shared`; `npm run ci:verify`; `npm run forecasts:check`; `npm run gates:check`; `npm run agents:check`; `npm run secrets:scan` |
| ADR / migration note | Link or `n/a` with reason |
| Decision | `approved` / `rejected` / `deferred` with reason |
| Rollback reference | Prior canon version and revert RFC |
| Effective phase | Design target / prototype / launch gate |

---

## 8. Enforcement and review cadence

- CI runs canon-related checks on every PR; a red check blocks merge regardless of approvals.
- Canon Steward reviews invariants at each phase gate and before any investor- or public-facing artifact is published.
- Investor, roadmap and readiness claims follow the approval-row rule above: record the RFC before publication, keep `npm run claims:check` green, and remember that a documentation-only change cannot promote a module or environment from Design or Prototype to Pilot or Production.
- Compliance/Legal reviewer re-reviews regulated claims at least once per release cycle and whenever a jurisdiction changes.
- Exceptions are never verbal: time-boxed feature exceptions use the 72-hour rule in `LEGAL_COMPLIANCE_SIGNOFF.md`; canon fact exceptions do not exist.

---

## 9. Governance references

- [`_canon.md`](./_canon.md) — canonical facts.
- [`DISCLAIMER.md`](./DISCLAIMER.md), [`FEATURE_STATUS.md`](./FEATURE_STATUS.md), [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) — maturity boundary.
- [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md) + [`config/market-forecasts.json`](./config/market-forecasts.json) — numeric provenance.
- [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) + [`config/high-risk-features.json`](./config/high-risk-features.json) — activation gate.
- [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md), [`ROADMAP.md`](./ROADMAP.md), [`API_POLICY.md`](./API_POLICY.md), [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md), [`SECURITY.md`](./SECURITY.md), [`adr/`](./adr/README.md).
