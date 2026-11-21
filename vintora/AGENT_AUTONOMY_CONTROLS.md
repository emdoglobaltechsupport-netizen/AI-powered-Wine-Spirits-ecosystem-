# Internal Agent Autonomy Controls

**Status: NO-GO for autonomous operation.** Ultimate AI TechOps is an internal Admin capability (`ADM-19`) with 24 agents. In this repository those agents are advisory: there is no live worker, no external tool invocation, no production credential and no autonomous side effect. Runtime execution is disabled and the independent agent kill switch starts engaged.

Canonical references: [`adr/ADR-0005-agent-boundaries.md`](./adr/ADR-0005-agent-boundaries.md), [`24-ai-techops-team-module.md`](./24-ai-techops-team-module.md), [`config/agent-autonomy-policy.json`](./config/agent-autonomy-policy.json) and the blocked `ai-agent-autonomy` record in [`config/high-risk-features.json`](./config/high-risk-features.json).

---

## 1. Enforced posture

| Control | Prototype implementation | Production evidence still required |
|---|---|---|
| Advisory by default | All 24 registered agents have `runtimeDefaultMode: advisory`; `executionEnabled` and `autonomousModeAllowed` are false in the register and shared evaluator. | Adversarial tests against real workers and model adapters; governance approval for any mode change. |
| Least-privilege allowlist | Six read/draft tools are globally allowlisted, with a checked per-agent subset for each of the 24 agents; 13 irreversible or high-blast-radius tools are explicitly denied, including publish, ad spend, email, payout, model promotion, role change, secret read, shell and network fetch. Unknown agents, tools, out-of-scope tools and modes are denied. | Per-agent production tool identities, scoped credentials and periodic access review. |
| Human approval | Irreversible and high-impact tool advice requires a distinct named human, an 8+ character reason and an unexpired approval window; self-approval is denied. | Production maker/checker workflow with IdP-backed identities and dual approval for T4. |
| Credential/network isolation | Tools declare a credential profile; mismatches and any network egress are denied. Secrets are never placed in prompts or fixtures. | Short-lived credentials, mTLS/signed workload identity, egress policy and secret-manager audit. |
| Prompt injection defence | Untrusted tool output is data only. Marking output as instructions is rejected and recorded as `prompt_injection_rejected`; all values pass schema validation before evaluation. | Red-team suite covering indirect injection, tool-output poisoning and cross-tenant signals. |
| Append-only audit | Every evaluation is written to `agent_decision_audit` with correlation ID, tenant, actor, agent, tool, intent, mode, tier, decision, reason code, reason and timestamp. Update/delete triggers reject mutation and RLS is forced. | WORM retention, tamper-evident hashing, central log sink and redaction verification. |
| Independent safe stop | `agent_kill_switch` is separate from per-model controls, starts engaged, has a 60-second design SLO and cannot be reset in the prototype. Engagement requires a distinct human approver and is audited. | A timed drill with real workers proving stop-new-runs and drain-in-flight under 60 seconds. |
| Testing gates | Sandbox, canary, replay and prompt-injection evidence are required before any hypothetical execution; execution remains denied even when evidence is supplied. | Actual sandbox/canary/replay runs and independent review of every high-impact tool action. |
| High-risk gate | `ai-agent-autonomy` is `blocked`, unsigned and all eight activation gates are unsatisfied. | Legal/Compliance sign-off, activation evidence and completed launch gates. |

`Guarded auto` shown in the Admin UI is a **simulation label**. It does not authorise execution; the runtime policy maps every agent to advisory mode.

## 2. API surface

All routes require an active Admin session, live time-boxed elevation and `admin:*:internal`; mutations additionally require `super_admin`.

| Endpoint | Purpose |
|---|---|
| `GET /v1/admin/agents/controls` | Read the advisory posture, independent kill-switch state, allowlist, deny list and required audit fields. |
| `GET /v1/admin/agents/audit?limit=100` | Read recent append-only agent decisions and tool calls. |
| `POST /v1/admin/agents/tools/evaluate` | Validate one advisory tool request, evaluate it against the shared deny-by-default policy, append the decision to the audit and return it. No external effect is performed. |
| `POST /v1/admin/agents/kill-switch` | Human-only safe-stop action (`action: "engage"`) with reason, correlation ID and a distinct named approver. Reset is blocked at the API and storage layers. |

Evaluation uses `evaluateAgentTool()` from `@vintora/shared`. The authenticated session supplies tenant and actor identity; client-supplied role, verification or credit claims are never accepted. The server derives kill-switch state, so a caller cannot bypass the safe stop by omitting or changing it.

## 3. Verification

- `npm run agents:check` verifies the 24-agent register, allow/deny lists, human approval, isolation, injection and audit fields, the blocked high-risk record, migration/API evidence and UI roster consistency.
- `npm run test:shared` runs the pure evaluator tests, including denial of unknown/denied tools, prompt injection, missing context, credential/network violations, self-approval, expired approvals and the never-allowed execution path.
- `npm run ci:verify` and both GitHub workflows include `agents:check` directly; `ci:verify` also runs the shared tests.

## 4. Explicit evidence gaps

No claim is made that autonomous agent operations are safe or ready. The following remain unproven: live worker containment, timed `< 1 min` kill-switch drill, production credential and egress controls, WORM/central audit retention, sandbox/canary/replay evidence, high-impact tool review records, and independent legal/compliance sign-off. All agent outputs and metrics in the prototype are deterministic demo values or design targets. See [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) and [`FEATURE_STATUS.md`](./FEATURE_STATUS.md).
