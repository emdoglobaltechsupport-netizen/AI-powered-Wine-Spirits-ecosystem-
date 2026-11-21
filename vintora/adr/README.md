# Vintora — Architecture Decision Records (ADRs)

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed. NO-GO for public launch.** Payments, age/KYC, AI, logistics and custody are simulated or deterministic behind adapter interfaces. All financial and scale figures are projections, targets or demo values.

This directory records the durable architectural choices behind the Vintora scaffold. Each ADR states what is **implemented now**, what is **simulated**, and what is **deferred** to a future phase. An ADR is not a launch approval and never overrides [`../DISCLAIMER.md`](../DISCLAIMER.md) or [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md).

---

## Canon snapshot

- **Brand:** VINTORA — *The World's Cellar, Intelligent.*
- **Exactly ten market-facing modules:** Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards.
- **Internal layers, not market-facing modules:** Admin Panel, Global Payments, AI Marketing Automation, Ultimate AI TechOps.
- **Hard guardrails:** age/KYC/licence before order; human approval before publish; no autonomous publishing, ad spend or email; advertising ≤ 8% of revenue; AI kill switch < 1 min design SLO; four-eyes with a distinct approver; T3/T4 reasons; time-boxed break-glass; append-only audit.
- **Production status:** `NODE_ENV=production` is rejected at startup. No ADR here changes that safeguard.

---

## Index

| ADR | Title | Decision in one line | Status |
|---|---|---|---|
| [ADR-0001](./ADR-0001-database.md) | Database, tenancy and audit | PostgreSQL 16 with `tenant_id` row-level security, append-only audit and a staged Citus/search path; no cross-tenant reads. | Accepted for prototype scope; production scale-out proposed |
| [ADR-0002](./ADR-0002-payments.md) | Payments and money movement | Simulated adapter behind a real interface; no PAN/CVV; idempotency and 15-minute FX lock; ledger, settlement, reconciliation and disputes are required future work. | Accepted for prototype scope; live launch blocked |
| [ADR-0003](./ADR-0003-ai.md) | Artificial intelligence | Deterministic adapters, grounding and provenance, eval gates, human approval, kill-switch design SLO and an 8% ad-spend ceiling; no real model calls. | Accepted for prototype scope; real models proposed |
| [ADR-0004](./ADR-0004-custody.md) | Vault custody | Vault is a simulation only; no custodian, no fractional title, no exchange or broker claims; licensed custody and legal opinions required before any real feature. | Accepted for prototype scope; real feature blocked |
| [ADR-0005](./ADR-0005-agent-boundaries.md) | Agent boundaries | 24 TechOps agents live in internal ADM-19; read-only/advice/draft-only by default with allowlists, four-eyes and time-boxed break-glass; agents never add a module or workspace. | Accepted for prototype scope; autonomy proposed |
| [ADR-0006](./ADR-0006-repository-governance.md) | Repository-wide governance controls | Machine-readable registers and CI checks for ADRs, canonical metadata, evidence, fixtures, claim changes, status, release gates, retention and network isolation. | Accepted for prototype scope; hosted evidence blocked |

---

## Status vocabulary

| Status label | Meaning |
|---|---|
| **Accepted for prototype scope** | The decision governs the runnable local scaffold and its tests today. It is not a production approval. |
| **Proposed** / **proposed for production** | The design direction is recorded, but implementation and independent evidence are outstanding. |
| **Blocked** | A legal, licensed-provider or operational gate must be closed before any real behaviour is enabled. |
| **Superseded** | Replaced by a later ADR; retained for history only and no longer current guidance. |
| **Rejected** | Considered and not adopted; retained to prevent repeated unevidenced proposals. |

Every ADR uses the same sections: **Status**, **Context**, **Decision**, **Consequences** (positive/negative), **Alternatives considered**, **Compliance/guardrail implications**, **Verification/evidence**, **Review triggers**. See [`../ADR_PROCESS.md`](../ADR_PROCESS.md) for the repository-wide workflow and [`TEMPLATE.md`](./TEMPLATE.md) for the required skeleton.

---

## Reading order

1. Start with [`../DISCLAIMER.md`](../DISCLAIMER.md) for the maturity boundary and data policy.
2. Check [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md) for the current implementation/regulation/readiness matrix.
3. Read the ADR relevant to the change being proposed.
4. For API-level controls, cross-reference [`../API_POLICY.md`](../API_POLICY.md).
5. For money movement, cross-reference [`../FINANCIAL_CONTROLS.md`](../FINANCIAL_CONTROLS.md).
6. For dependency and audit controls, cross-reference [`../SECURITY.md`](../SECURITY.md).
7. For the launch gate checklist, cross-reference [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md).

---

## Governance links

- [`../DISCLAIMER.md`](../DISCLAIMER.md) — maturity and compliance disclaimer.
- [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md) — implementation and production-readiness matrix.
- [`../API_POLICY.md`](../API_POLICY.md) — versioning, auth, idempotency and audit requirements.
- [`../FINANCIAL_CONTROLS.md`](../FINANCIAL_CONTROLS.md) — reconciliation, refunds, disputes and segregation of duties.
- [`../SECURITY.md`](../SECURITY.md) — dependency policy, SBOM and secure-development requirements.
- [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) — the NO-GO gate checklist.

---

## Maintenance rule

A change to an ADR requires a pull request that (a) updates the affected `Verification/evidence` row with an actual command or test, (b) updates [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md) if readiness changes, and (c) preserves the NO-GO posture until [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) is fully evidenced. Silently promoting a simulated decision to "production" in an ADR is not permitted.
