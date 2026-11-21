# Vintora Architecture Decision Record Process

> **Prototype mode — no real orders are placed. NO-GO for public launch.** An ADR records a prototype-scope decision or a proposed future direction; it is not launch approval, legal clearance or evidence that a target is achievable. Machine authority: [`config/adr-process.json`](./config/adr-process.json); checked by `npm run adr:check`.

## 1. Scope and authority

This process is repository-wide. It covers API boundaries, schemas, infrastructure, security, data lifecycle, AI action tiers, catalogue provenance and release controls. [`_canon.md`](./_canon.md) remains the product-definition authority; [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) owns canon amendments. An ADR may explain a canon-constrained choice but may not change the ten modules, four internal layers, NO-GO verdict or a fail-closed gate.

The index is [`adr/README.md`](./adr/README.md) and the mandatory skeleton is [`adr/TEMPLATE.md`](./adr/TEMPLATE.md). ADR identifiers are sequential `ADR-NNNN`; a decision is never silently rewritten. A replacement records `Superseded by ADR-NNNN` in the old record and links the new decision.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| `Accepted for prototype scope` | Governs the runnable local prototype and its checks today; not production approval. |
| `Proposed` | Direction is recorded; implementation and independent evidence are outstanding. |
| `Blocked` | A legal, licensed-provider, security or operational gate must close before real behaviour is enabled. |
| `Superseded` | Replaced by a later ADR; retained for history and not used as current guidance. |
| `Rejected` | Considered and not adopted; retained to prevent repeated unevidenced proposals. |

Every ADR must include: **Status**, **Context**, **Decision**, **Consequences**, **Alternatives considered**, **Compliance/guardrail implications**, **Verification/evidence** and **Review triggers**. The verification table must name a runnable check or an explicit `null` evidence gap.

## 3. Workflow

1. Open a change record before implementation when an API/schema/architecture boundary changes. State the problem, affected canon facts, threat-model impact and evidence gaps.
2. Use the template and choose a prototype-scope status. Real-provider, production-scale or regulated behaviour is `Proposed` or `Blocked` until independently evidenced.
3. Link the ADR from the pull request. The Principal Architect or delegate reviews it; a distinct approver is required. Self-approval cannot satisfy the process.
4. Update `Verification/evidence` with the actual check command and result register. Update [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) and [`STATUS_DASHBOARD.md`](./STATUS_DASHBOARD.md) if a prototype state changes; do not promote a feature by ADR text alone.
5. Run `npm run adr:check`, `npm run docs:check`, `npm run claims:check` and the relevant domain gates. A green run proves repository parity only.
6. Review each accepted ADR quarterly against high-risk feature evidence, threat-model gaps and launch readiness. Record the review date and owner role.

## 4. Guardrails

- No ADR may authorise a real age, KYC, sanctions, payment, marketing, custody or model provider call from this prototype.
- No ADR may weaken profile guards, adapter defaults, human release gates, catalogue isolation, migration fail-closed behaviour or the NO-GO verdict.
- No ADR may turn a target into a result or use `production-ready` without attached evidence; every component remains `not production-ready` until that evidence exists.
- Superseded and rejected ADRs remain readable; only the index status changes.

## 5. Evidence gaps

No named individual holds the Principal Architect or approver role in this workspace, no hosted Architecture Review Board record is attached, and no ADR carries production evidence. This process is a Design-state control definition, not a completed governance attestation.
