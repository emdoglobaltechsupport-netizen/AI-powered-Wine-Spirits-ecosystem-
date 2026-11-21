# ADR-0006 — Repository-wide governance controls

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This ADR records a repository-wide governance process only; it is not architecture approval, legal clearance or evidence that a target is achievable.

## Status

Accepted for prototype scope. Supersedes no earlier ADR. It does not approve production launch.

## Context

Earlier ADRs cover database, payments, AI, custody and agent boundaries, but governance evidence was scattered across prose. Audit findings required a repository-wide ADR process, onboarding/investor/regulatory document separation, canonical metadata, evidence indexing, fixture labelling, claim change control, status and release gates, retention architecture, network isolation and Markdown/schema CI checks.

## Decision

Adopt machine-readable registers under `config/` for ADRs, canonical metadata, evidence, fixtures, claim change management, status, release gates, retention architecture and network isolation. Each register has a deterministic checker wired into `npm run ci:verify` and a human-readable document. [`README.md`](../README.md) is the onboarding entry point; [`INVESTOR_DOCUMENTATION.md`](../INVESTOR_DOCUMENTATION.md) and [`REGULATORY_DOCUMENTATION.md`](../REGULATORY_DOCUMENTATION.md) carry their respective boundaries. All figures remain projections, targets, estimates or demo values.

## Consequences

Positive: canonical values, links, fixture labels and claim boundaries are checked on every CI run; evidence gaps are explicit nulls rather than implied approvals.
Negative: more registers require review and can fail CI on drift; the gates prove metadata parity, not correctness of targets.
Explicitly deferred: hosted CI results, signed releases, penetration tests, load measurements, DPIAs, counsel opinions and production deployment remain blocked.

## Alternatives considered

- Keep governance only in Markdown: rejected because duplicate numbers and stale links already caused audit findings.
- One monolithic status document: rejected because it conflates onboarding, investor planning and regulatory evidence.
- Trust generated CI badges as evidence: rejected because no hosted result is attached to this workspace.

## Compliance/guardrail implications

No high-risk feature changes state. Financial, safety and regulatory claims require the change records in [`CLAIMS_CHANGE_MANAGEMENT.md`](../CLAIMS_CHANGE_MANAGEMENT.md). Retention and deletion behaviour is defined but unimplemented in [`DATA_RETENTION_ARCHITECTURE.md`](../DATA_RETENTION_ARCHITECTURE.md). Prototype ports are loopback-bound through a Compose-internal data network as described in [`NETWORK_ISOLATION.md`](../NETWORK_ISOLATION.md).

## Verification/evidence

| Check or evidence | Result | Boundary |
|---|---|---|
| `npm run adr:check` | Local ADR structure and registry check | Phase 1 parity only |
| `npm run canonical:check` | Local source-derived metadata check | No target validation |
| `npm run evidence:check` | Local link and gap check | No external report attached |
| `npm run fixtures:check` | Local fixture taxonomy check | No live fixture exists |
| `npm run claims-change:check` | Local change-control metadata check | No signed change record attached |
| `npm run status:check` | Local status and release-gate check | Static dashboard only |
| `npm run markdown:check && npm run schemas:check` | Local Markdown and JSON consistency checks | No hosted lint result |
| `npm run network:check` | Local Compose isolation check | No hosted network evidence |
| `null` | Hosted CI, signed release, penetration test, load test, DPIA and counsel review | Evidence gaps remain open |

## Review triggers

1. Any new or superseded ADR.
2. A change to canonical modules, regions, currencies, languages or counts.
3. A financial, safety or regulatory claim change.
4. New evidence that could close an evidence gap.
5. Quarterly architecture and repository-policy review.
