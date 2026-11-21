# ADR-NNNN — Short title

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Copy this file to `adr/ADR-NNNN-slug.md`, replace every placeholder, and add the ADR to [`README.md`](./README.md) and `config/adr-process.json#registry`.

## Status

`Proposed` or `Accepted for prototype scope` or `Blocked`. Do not use a production status. If superseding an earlier decision, add `Supersedes ADR-NNNN`.

## Context

What problem does this solve? Which canon fact, threat, evidence gap or failed check forces a decision? Record what is implemented now, what is simulated and what is deferred.

## Decision

State the decision in one sentence, then the enforceable rules. Name the commands, configs or code boundaries that make the decision observable.

## Consequences

Positive: what this enables or makes auditable in the prototype.
Negative: cost, latency, complexity or capability deliberately not provided.
Explicitly deferred: real providers, scale, jurisdictions or regulated behaviour that remain blocked.

## Alternatives considered

List rejected options and why they were rejected. Do not invent evidence or provider approvals to justify a choice.

## Compliance/guardrail implications

Name affected high-risk features, lawful-basis or retention boundaries, adapter modes, AI action tiers, human release gates and network/secret boundaries. State `no change` where accurate.

## Verification/evidence

| Check or evidence | Result | Boundary |
|---|---|---|
| `npm run <relevant-gate>` | Local command definition; no hosted result attached | Phase 1 parity only |
| `null` | Evidence gap | Describe the missing legal, operational or performance evidence |

## Review triggers

1. A change to the named config, API, schema or workflow.
2. New evidence that could close a listed gap.
3. Quarterly architecture and high-risk-feature review.
4. Any request to promote the decision beyond Prototype state.
