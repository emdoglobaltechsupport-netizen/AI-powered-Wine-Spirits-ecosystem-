# Vintora AI Safety Accountability Controls

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This document is a control specification for deterministic Phase 1 adapters, not evidence that evaluations, human review or production safety controls are complete.

## Authority

Machine authority: [`config/ai-safety-policy.json`](./config/ai-safety-policy.json), checked by `npm run ai:safety:check`. Shared implementation: [`packages/shared/src/ai-safety.ts`](./packages/shared/src/ai-safety.ts). No AI surface may execute an external effect; `executionEnabled`, `externalEffectsEnabled` and `autonomous release` are false.

## Four-tier action taxonomy

| Tier | Meaning | Prototype use |
|---|---|---|
| `read_only` | Information with no persisted or external side effect. | Internal metrics/catalogue reads. |
| `recommendation` | Suggests products or actions; a human or user decides. | Sommelier, Assist and pricing signals. |
| `draft` | Reviewable artefact not externally visible until a distinct human approves it. | Studio, marketing and TechOps advice. |
| `execution` | External or state-changing effect: publish, spend, send, price change, order. | **Always denied.** |

The tier is carried in the shared evaluator, the API response (`actionTier`) and the browser reply metadata. A registered surface must use its declared tier; mismatch, execution intent and external effects are denied with explicit reason codes.

## Human confirmation gates

Purchases require explicit user confirmation and a deterministic service, never model execution. Marketing spend, campaigns and pricing changes require a named human approver distinct from the actor, an 8+ character reason and an unexpired window. Self-approval and client-supplied approval identity are rejected. Guardrails are additional to the blocked high-risk records in `config/high-risk-features.json`; they do not permit activation.

## Grounding, citations and safety

- Cite-or-abstain: every customer-facing answer requires at least one non-empty citation or retrieval source; the API Sommelier refuses and returns an abstention when validation fails.
- Prohibited recommendations cover health/medical claims, safe-drinking claims, guaranteed or risk-free returns, intoxication encouragement, minor targeting and investment-advice claims. The same five pattern sources are enforced in policy, shared code and the browser mirror.
- Every answer carries the responsible-drinking notice plus a support-resource notice. Harmful-use language and protected audiences are blocked by the deterministic Sommelier guard; concrete limits, re-verification triggers and policy-review gaps are specified in [`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md). Static UI surfaces that generate text are screened before being displayed; a blocked output is replaced with an abstention.
- Required provenance fields: `promptId`, `promptVersion`, `modelKey`, `modelVersion`, `retrievalSourceIds`, `factPacketHash`, `approvalId`. Logs must redact personal data and be append-only.

## Evaluation gates

Groundedness ≥ 95%, fact adherence ≥ 98%, confirmation compliance 100% and zero safety violations are **requirements**, not measured results. Offline evaluation, a prompt-injection suite and human review are required before release; `releaseBlocked` is true and evidence reference, reviewer and review date are null.

No offline evaluation result is attached. No human-reviewed model or prompt promotion record, production retrieval log sink, licensed safety classifier or health-claim verifier exists. Green gates prove configuration parity only.

## Verification

`npm run ai:safety:check` verifies policy/code/UI parity, blocked high-risk records and agent/marketing fail-closed flags. `npm run test:shared` exercises the pure evaluators. `npm run ci:verify` includes both. None of these results validate a model, approve an external action or grant launch clearance.
