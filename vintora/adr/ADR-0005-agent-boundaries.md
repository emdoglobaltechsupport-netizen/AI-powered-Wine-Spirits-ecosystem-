# ADR-0005 — Agent Boundaries, Tool Allowlists and Four-Eyes Control

## Status

**Accepted for prototype scope.** Twenty-four TechOps agents are an internal capability of the Admin Panel (`ADM-19`), not a market-facing module. Default mode is read-only/advice/draft-only with allowlisted tools, least privilege, reason-bearing escalation and human four-eyes. **Proposed** for real autonomy in a production environment; no such autonomy is authorised today. See [`../DISCLAIMER.md`](../DISCLAIMER.md) and [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md).

---

## Context

- The product canon locks exactly ten market-facing modules: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards. Admin Panel, Global Payments, AI Marketing Automation and Ultimate AI TechOps are internal layers.
- The Admin console simulates 19 workspaces. `ADM-19` is the Ultimate AI TechOps workspace and hosts a roster of 24 specialist agents (for example `CTO-01`, `DEV-01`, `SRE-01`, `QA-01`, `SEC-01`, `DBA-01`, `API-01`, `MDL-01`, `CMP-01`, `FRD-01`, `LIC-01`, `MQC-01`). This is internal tooling, not an eleventh module.
- Agent default modes in the design range from `Observe` to `Assist` to `Guarded auto`, with a maximum tier per agent (T1–T4). All local values are deterministic simulation and design targets, not live operations.
- Guardrails: human approval before publish; no autonomous publishing, ad spend or email; advertising ≤ 8% of revenue; AI kill switch < 1 minute design SLO; T3/T4 reasons and distinct approver; time-boxed break-glass; append-only audit.
- AI output across Sommelier, Assist, Studio and TechOps is deterministic and labelled; see [`./ADR-0003-ai.md`](./ADR-0003-ai.md). Payment and custody actions have their own boundaries in [`./ADR-0002-payments.md`](./ADR-0002-payments.md) and [`./ADR-0004-custody.md`](./ADR-0004-custody.md).
- Uncontrolled agents could publish content, raise ad spend, send email, promote a model, approve a refund, or add a new module/workspace. The decision must make those outcomes structurally impossible without human authority.

### Canon snapshot

VINTORA — *The World's Cellar, Intelligent.* Ten market-facing modules, 19 internal Admin workspaces, 24 TechOps agents inside `ADM-19`. Prototype mode — no real orders are placed; deterministic simulation only, no real external actions. NO-GO for production.

---

## Decision

### 1. Agents live inside ADM-19 and never change the module/workspace inventory

- The 24 agents are registered in the internal TechOps workspace `ADM-19` under the Admin Panel layer. They are not user-facing modules and cannot appear in the ten-module market-facing navigation.
- **Agents never add an eleventh market-facing module or a twentieth workspace.** Module/workspace inventory is a canon-controlled constant; any change requires a canon revision and human governance approval, not an agent action.
- Agent-created artefacts are drafts, alerts, evidence summaries or recommendations stored in internal tables. They do not create new product surfaces.

### 2. Default posture is read-only, advice or draft-only

- Every agent has a declared default mode and maximum tier. `Observe` = read signals; `Assist` = analysis and recommendation; `Guarded auto` = only reversible, idempotent-safe playbooks inside a narrow allowlist (future capability, not enabled for real side effects in the prototype).
- No agent may, without a named human approver: publish listings or content, change prices, submit or raise ad spend, send marketing email or customer messages, place or cancel orders, approve refunds/disputes/payouts, promote a model, change access roles, or alter audit history.
- The load-bearing default is "propose, do not perform". Autonomy increases only by explicit ADR amendment with evidence, never by prompt tweak or feature flag.

### 3. Tool allowlists and least privilege

- Each agent has a per-domain tool allowlist (for example `SRE-01`: read metrics/alerts, open incident draft, propose safe containment; `MQC-01`: read listings/provenance, flag samples; `LIC-01`: read licence registry, propose payout hold). Tools outside the list are denied by the policy engine before any model or adapter is invoked.
- Credentials are scoped per tool, short-lived, and never exposed in prompts, logs or fixtures. Service identities use mTLS/signed JWT in production per [`../API_POLICY.md`](../API_POLICY.md); none are live in the prototype.
- Database access follows the database decision in [`./ADR-0001-database.md`](./ADR-0001-database.md): non-bypass role, per-request tenant context, RLS, no cross-tenant reads. Agents receive the minimum tenant/domain scope needed for the task.
- The orchestrator deduplicates signals, assigns a risk tier and records a policy decision for every run; the deterministic simulation stores `techops_agents`, `techops_agent_runs`, `techops_workflows` and `techops_alerts` style records with seeded demo values.

### 4. Four-eyes, reasons and tiered escalation

- T1/T2: informational or low-risk advice; no external effect. T3: material actions (infrastructure change, payout hold, price/fee proposal) require a reason and a distinct approver. T4: critical actions (security containment, model promotion, compliance escalation, publication authority) require T4 reason, dual approval and recorded rollback.
- A requester may not approve their own escalation; the approver must be a distinct named human. Elevation is time-boxed, expires automatically and is audited.
- Representative workflows in the simulation: `WF-INC` (incident, P0 pages human), `WF-REL` (release, named human approval before production), `WF-COST` (spend variance, T3 for infrastructure change), `WF-FRD` (no autonomous adverse decision), `WF-MDL` (T4 dual approval for promotion, halt target < 1 min), `WF-LIC` (T3 payout hold, human verification). These targets are designs, not operational results.

### 5. No autonomous publish, spend or email

- Publishing tools are approval-gated by a human; agents may attach a draft and evidence but cannot flip a published state.
- Ad-spend tools enforce the ≤ 8% of revenue ceiling outside the agent; the ceiling cannot be raised by an agent, a prompt or a simulated budget. Any campaign output is a draft until approved.
- Email/messaging tools are draft-only: an agent may compose a reply or alert summary, but a human sends it. No autonomous outbound customer or supplier communication.

### 6. Break-glass, audit and kill switch

- Time-boxed break-glass elevation is the only path to exceptional privileges. It requires a case/ticket reference, reason, named requester, distinct approver, automatic expiry and append-only audit. Use of break-glass triggers review, not silence.
- Every agent run records: agent code, tenant, trigger, signal hash, tools requested/granted, policy decision, output hash, approver, outcome, duration and `requestId`. Secrets, PAN/CVV, tokens and unnecessary PII are redacted. Audit storage is append-only in the target design; prototype baseline is structured stdout plus Admin append-only rows where available.
- A global agent kill switch can disable agent execution independently of individual model toggles. Design SLO: < 1 minute to stop new runs and fall back to human-only operation, with an audited actor/reason. This is untested against real workers; see [`./ADR-0003-ai.md`](./ADR-0003-ai.md) for the related model switch.
- Any agent that encounters a compliance gate (age/KYC/licence, payment precondition, custody restriction) stops and escalates; it never routes around the gate.

---

## Consequences

### Positive

- A prompt-injection or hallucination incident in an agent cannot directly publish, spend, email or move money.
- Internal tooling stays internal: the ten-module canon and 19-workspace inventory cannot drift through agent automation.
- Allowlists and least privilege make blast radius visible and reviewable per agent.
- Four-eyes with distinct approver and T3/T4 reasons produces an evidence trail for regulators and auditors.
- Independent kill switches for agents and models give operators a fast, auditable containment path.

### Negative

- Human approval adds latency and operational load; 24 agents generating drafts could create an approval queue that needs real staffing.
- Maintaining 24 allowlists, modes and max tiers is ongoing governance work.
- Break-glass processes can be abused if expiry or review is not enforced; this must be tested.
- Reversible playbooks only help if genuinely reversible and idempotent; the prototype does not prove this.
- The < 1 minute kill-switch SLO is a design target with no real drill evidence.

---

## Alternatives considered

| Alternative | Why not adopted |
|---|---|
| Give agents direct production credentials and broad tool access | Violates least privilege and makes a single bug a publish/spend/email incident. |
| Let agents autonomously publish and optimise ad campaigns | Contradicts human-approval rule and ≤ 8% advertising cap. |
| Represent TechOps as an eleventh market-facing module | Breaks locked canon; it is an internal Admin capability (`ADM-19`). |
| Let agents create new workspaces on demand | Would drift from the 19-workspace simulation and bypass product governance. |
| Single shared agent identity with no per-run audit | Destroys accountability and four-eyes evidence. |
| Allow self-approval of escalations | Defeats segregation of duties; distinct approver is mandatory. |
| Always-on break-glass | Removes time-boxing and audit value; rejected. |

---

## Compliance/guardrail implications

- **Age/KYC/licence before order:** agents cannot bypass the synchronous order gate; any agent touching commerce stops at the precondition.
- **Human approval before publish:** enforced at the publish tool boundary; agent output is a draft.
- **No autonomous publishing/spend/email:** hard default; ad spend ceiling outside the agent at ≤ 8% of revenue.
- **Kill switch < 1 min:** separate agent and model switches, both design SLOs; real drill outstanding.
- **Four-eyes / T3/T4:** reason, distinct approver, expiry and recorded rollback for elevated actions.
- **Time-boxed break-glass:** ticket reference, reason, named requester/approver, automatic expiry, append-only audit and mandatory review.
- **Append-only audit:** every run, tool grant, decision and approval is an audit candidate with redaction; general API audit is only a prototype baseline.
- **Tenancy:** RLS and non-bypass role apply to agent reads/writes; no cross-tenant signal correlation outside approved aggregates.
- **Canon protection:** module and workspace inventories are constants under human governance, not agent-mutable state.

---

## Verification/evidence

| Claim | Evidence available in the prototype | Gap / future evidence |
|---|---|---|
| 24 agents inside ADM-19 | Admin simulation documents and seeds show `ADM-19` with the 24-agent roster and six workflow definitions | Runtime registry/role test proving agents cannot appear in market-facing navigation. |
| Ten modules / 19 workspaces fixed | Module and workspace lists are canonical in planning docs and Admin simulation; no create-module/workspace tool exists | Automated canon-invariant test and human governance sign-off on any change. |
| Draft-only defaults | Advisory-only runtime register, disabled execution and shared evaluator tests; no live workers | Production governance approval and adversarial tests against real workers. |
| Tool allowlists / least privilege | 24-agent machine register, six allowlisted tools, 13 denied tools and evaluator tests for unknown/denied tools, credential mismatch and network egress | Per-agent production identities, scoped credentials, cross-tenant integration tests and access review. |
| Four-eyes / T3/T4 | Admin simulation enforces reason, elevation, distinct approver and expiry; evaluator requires distinct, reasoned, unexpired approval for high-impact advice | Independent approval audit and segregation-of-duties review in a production-like environment. |
| Audit of runs | Append-only `agent_decision_audit` with correlation, tenant, actor, agent, tool, intent, tier, decision and reason; RLS forced, mutation triggers reject updates/deletes | WORM retention, hashed outputs, redaction verification and central audit sink. |
| Kill switch < 1 min | Independent `agent_kill_switch`, engaged by default, separate from model controls, human engage with distinct approver, reset blocked by API/trigger; design SLO only | Timed drill with real agent workers and model adapters; **not performed**. |
| No autonomous spend | Cap represented in demo registry/config; no spend execution exists | Real spend accounting, ≤ 8% cap verification and human approval records. |

The advisory control plane is machine-checked by `npm run agents:check`, with the full enforcement summary in [`../AGENT_AUTONOMY_CONTROLS.md`](../AGENT_AUTONOMY_CONTROLS.md) and the register in [`../config/agent-autonomy-policy.json`](../config/agent-autonomy-policy.json). No evidence above demonstrates production autonomous operations. All agent targets, SLAs and outcomes are designs, simulations or projections.

---

## Review triggers

Reopen this ADR when any of the following occurs:

1. An agent is given a new tool, write permission, credential or external endpoint; re-check allowlist and approval boundary.
2. A default mode or max tier changes from `Observe`/`Assist`/draft-only toward autonomy.
3. A publish, ad-spend, email, order, refund, dispute, payout, model-promotion or role-change tool is added.
4. The advertising cap, kill-switch SLO, tier definitions or break-glass duration changes.
5. Break-glass is invoked, expires incorrectly, or is used by the same actor as the approver.
6. A cross-tenant read, leaked secret, injected prompt or unaudited run is observed.
7. The ten-module list or 19-workspace inventory is proposed for change; require canon revision, not agent action.
8. The agent roster changes from 24 or `ADM-19` is renamed; update canon references and this ADR.
9. Real model adapters or agent workers are deployed; re-run kill-switch and audit drills.
10. A launch gate in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) is claimed complete or `NODE_ENV=production` is proposed.
