# ADR-0003 — Artificial Intelligence, Evals and External Action Boundaries

## Status

**Accepted for prototype scope.** Sommelier, Assist, Studio and the internal TechOps/AI layers use deterministic adapters with labelled, rule-derived output; there are no real model calls. **Proposed** for evaluated real models, safety reviews, production audit and a tested kill switch. See [`../DISCLAIMER.md`](../DISCLAIMER.md) and [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md).

---

## Context

- Vintora Sommelier (pairing/education), Vintora Assist (cross-module concierge) and Vintora Studio (generative content for sellers/brands) are among the ten locked market-facing modules. AI Marketing Automation is an internal layer, not a module.
- Every AI surface in this repository is a deterministic adapter. Outputs are grounded in bundled catalogue/provenance data, labelled as derived, and accompanied by responsible-drinking and non-advice notes. No external model, embedding or vision provider is called.
- The Admin simulation includes a model registry with `model_key`, `model_version`, `stage`, `status`, `rollout_pct`, `spend_cap_usd`, `kill_switch`, `fallback_model_version` and `eval_summary_json`. These are demo rows; they do not control a real model.
- Guardrails: human approval before publish; no autonomous publishing, ad spend or email; advertising ≤ 8% of revenue by design; AI kill switch < 1 minute design SLO; T3/T4 reasons and distinct approver for elevated actions; time-boxed break-glass; append-only audit.
- The canonical roadmap mentions frontier models, RAG over a wine knowledge graph, recommenders, computer vision and RL pricing. These are **projections/design targets**, not implemented capabilities and not evidence of production AI.
- Alcohol content makes safety, age gating and responsible-drinking language non-negotiable; AI must not bypass the order compliance gate in [`./ADR-0002-payments.md`](./ADR-0002-payments.md).

### Canon snapshot

VINTORA — *The World's Cellar, Intelligent.* Ten market-facing modules only. Prototype mode — no real orders are placed; there are no real model calls or campaigns. All figures are projections or demo values. NO-GO for production.

---

## Decision

### 1. Deterministic adapters are the only runtime in prototype mode

- Define an adapter interface (prompt/context in, structured answer + provenance + safety labels out). The default adapter is deterministic and local; it must be clearly labelled in responses and logs as simulated.
- No API key, endpoint or credential for a model provider exists in the repository. Real model calls are prohibited until the launch gates in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) are closed and independently reviewed.
- Determinism is a feature for CI: the same input and catalogue snapshot produce the same output, enabling regression tests without cost or network access.

### 2. Grounding and provenance are mandatory

- Every answer must cite the catalogue/provenance records or rules it used. Where evidence is missing, the adapter returns "insufficient evidence" rather than inventing a fact, price, availability, award or health claim.
- Conflicting, low-confidence or fixture-sourced data is excluded from the verified views used for grounding (see [`./ADR-0001-database.md`](./ADR-0001-database.md)). Derived labels are marked `derived` and never presented as supplier attestation.
- Sommelier output includes a responsible-drinking note and does not provide medical, legal or investment advice. Vault-related investment questions route to the simulation boundary in [`./ADR-0004-custody.md`](./ADR-0004-custody.md).

### 3. Human approval before publish or external effect

- Studio drafts, Sommelier content and Assist replies are drafts. Publishing, pricing changes, campaigns, refunds, disputes and model promotion require a named human approver with a reason and, for T3/T4, a distinct approver (four-eyes).
- **No autonomous external actions.** AI may not publish listings or content, submit ad spend, raise budgets, send marketing email or messages, place orders, approve refunds, or promote models. Tools are allowlisted and the default mode is read-only/advice/draft-only; see [`./ADR-0005-agent-boundaries.md`](./ADR-0005-agent-boundaries.md).
- Advertising is capped at ≤ 8% of revenue by design. The cap is a configuration/control ceiling enforced outside the model; no prompt, agent or adapter can raise it. Studio campaign output is a draft until a human approves within the cap.

### 4. Evals and promotion gates

- Introduce an offline eval set covering grounding accuracy, provenance coverage, refusal of unsupported claims, alcohol-safety language, multilingual behaviour, latency and cost per request. A deterministic baseline must be established before any real model is compared.
- Promotion gate (future): candidate model must beat the deterministic baseline on the eval set, pass safety review, carry a model card, respect the spend cap, and receive T4 dual approval with a recorded rollback/fallback version. No auto-promotion.
- `MDL-01` (AI Model Monitoring Agent) may *advise* on drift or eval-gate breach; it may not promote. Escalation follows `WF-MDL` with human approval.
- Eval results are recorded in `eval_summary_json` style audit records with model key, version and evaluator identity; today those values are demo data.

### 5. Kill switch design SLO

- Target: **< 1 minute** to disable an AI surface end-to-end (stop new requests, fall back to deterministic or safe static response, preserve audit). This is a **design SLO only**; the Admin simulation exposes a toggle, but no real-adapter drill has been performed.
- The switch must be reachable independently of the model gateway, must not require a code deploy, and must be audited with actor, reason and timestamp.
- Real-adapter kill-switch drill, including partial-failure and rollback paths, is a launch gate. Until then, no availability claim is made.

### 6. Audit prompts, outputs and approvals

- Record for each AI interaction: `requestId`, tenant/user pseudonym, adapter and version, prompt/template ID, hashed prompt, hashed output, provenance references, safety labels, approval state and outcome. Redact personal data, secrets and government IDs before hashing.
- Audit writes follow the append-only model in [`./ADR-0001-database.md`](./ADR-0001-database.md); general stdout audit is only a prototype baseline.
- Prompt/output retention and access are role-restricted and audited. Prompts may contain alcohol-related preferences; treat them as sensitive.

### 7. No production AI claim

- All improvement figures, adoption rates, token budgets and model-capability descriptions in the planning documents are projections. Nothing here claims evaluated, safe or production-grade AI.

---

## Consequences

### Positive

- Deterministic adapters make demos reproducible and CI cheap; no network, cost or provider outage can break the prototype.
- Mandatory provenance makes unsupported claims visible and prevents fixture data from being presented as verified fact.
- Draft-only defaults and tool allowlists prevent an AI bug from becoming a publish, spend or email incident.
- A spend cap outside the model prevents prompt-level budget escalation; the ≤ 8% advertising rule is structurally enforced.
- The kill-switch SLO and eval gate are recorded as design commitments with explicit evidence gaps, not hidden assumptions.

### Negative

- Deterministic output is narrower than a real model; demos will not showcase open-domain reasoning, vision or speech.
- Building an eval set before real models is upfront work with no immediate user-facing payoff.
- Hashing prompts/outputs for audit adds storage and requires careful redaction design.
- Human approval creates latency; it is a deliberate control, not an inefficiency to be removed by automation.
- The < 1 minute kill switch is unproven; real infrastructure may need redesign to meet it.

---

## Alternatives considered

| Alternative | Why not adopted |
|---|---|
| Call a frontier model API in prototype mode | Requires keys, cost control, safety eval and privacy review; contradicts NO-GO and no-real-model-calls rule. |
| Use live RAG over a knowledge graph now | The graph, embeddings and provenance pipeline are design targets; no verified corpus exists yet. |
| Allow autonomous campaign publishing/spend | Directly violates human-approval and ≤ 8% ad-spend guardrails. |
| Trust model self-reporting for provenance | Provenance must come from verified source records, not generated text. |
| Set the kill switch inside the model gateway only | A gateway failure could make the switch unreachable; independent control path required. |
| Skip evals until production | Without a deterministic baseline, later model comparison would be subjective and unauditable. |
| Treat demo model-registry rows as real rollout state | They are labelled simulation data; promoting them would be a false production claim. |

---

## Compliance/guardrail implications

- **Age/KYC/licence before order:** AI never bypasses the order gate; Assist must not place orders without the same preconditions.
- **Human approval before publish:** all AI-generated publishable content is a draft until approved.
- **No autonomous publishing/spend/email:** enforced by draft-only defaults and tool allowlists; see [`./ADR-0005-agent-boundaries.md`](./ADR-0005-agent-boundaries.md).
- **Advertising ≤ 8% revenue:** hard cap outside the model; Studio drafts must fit the cap and be human-approved.
- **Kill switch < 1 min:** design SLO with simulated toggle; real drill outstanding.
- **Four-eyes / T3/T4:** model promotion, safety exceptions and elevated agent actions require reason and distinct approver.
- **Append-only audit:** prompts, outputs and approvals are audit candidates; redaction and retention are mandatory.
- **Responsible drinking:** safety language and refusal of medical/legal/investment advice are part of grounding policy.

---

## Verification/evidence

| Claim | Evidence available in the prototype | Gap / future evidence |
|---|---|---|
| No real model calls | Deterministic adapters; no provider keys/endpoints in fixtures or `.env.example`; labelled derived output | Network egress test proving no model provider is contacted. |
| Grounding/provenance | Answers reference bundled catalogue/provenance fields; verified views exclude fixtures and low confidence | Evaluate against a licensed catalogue with real supplier attestation. |
| Human approval before publish | Admin simulation enforces reason, elevation and distinct approver for guarded mutations | Independent approval-workflow audit in production-like environment. |
| Eval gates | Demo `eval_summary_json` in model registry seeds (labelled simulation) | Offline eval set, baseline results, safety review and T4 promotion record. |
| Kill switch < 1 min | Simulated toggle in ADM-19 / model registry | Timed drill against real adapters, including rollback; **not performed**. |
| Spend cap ≤ 8% | Cap represented in demo registry/config; no ad spend exists | Real spend accounting and monthly revenue-based cap verification. |
| Prompt/output audit | Structured stdout baseline with `requestId`; append-only tables exist for catalogue/Admin | Append-only AI audit store with hashed/redacted payloads and access controls. |
| Safe commerce interaction | Sommelier/Assist smoke checks and safety note in responses | Safety review and responsible-drinking sign-off per launch market. |

No evidence here demonstrates production AI readiness. All model, adoption and cost figures are projections.

---

## Review triggers

Reopen this ADR when any of the following occurs:

1. A real model provider, embedding service, OCR/vision or speech API is proposed or configured.
2. A prompt template changes in a way that affects provenance, safety language or refusal behaviour.
3. An eval baseline or gate threshold changes, or a model is proposed for promotion beyond `stage`/`status` demo values.
4. An AI surface is given a new tool, write permission or external action; re-check allowlists and approval.
5. Advertising spend, promoted listings or campaign execution is enabled; verify the ≤ 8% cap and human approval.
6. A kill-switch toggle is exercised, or the < 1 minute SLO is threatened by architecture changes.
7. An incident involving hallucinated provenance, unsupported claim, unsafe alcohol content or leaked prompt data.
8. Audit retention/redaction requirements change for prompts or outputs.
9. Agent autonomy defaults change from read-only/advice/draft-only; coordinate with [`./ADR-0005-agent-boundaries.md`](./ADR-0005-agent-boundaries.md).
10. A launch gate in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) is claimed complete or `NODE_ENV=production` is proposed.
