# Vintora Financial, Safety and Regulatory Claims Change Management

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/claims-change-management.json`](./config/claims-change-management.json); checked by `npm run claims-change:check`. This process records required approvals; it is not a signed approval log or evidence that a claim is true.

## 1. Scope

Every change to a financial, safety or regulatory claim requires a change record before publication. This includes investor and roadmap figures, AI action-tier descriptions, responsible-drinking limits, security guarantees, retention statements, jurisdiction status, licensing language and feature readiness. Cosmetic edits that alter no claim do not require a record.

Canon changes remain governed by [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md); investor material is separated in [`INVESTOR_DOCUMENTATION.md`](./INVESTOR_DOCUMENTATION.md) and regulatory material in [`REGULATORY_DOCUMENTATION.md`](./REGULATORY_DOCUMENTATION.md). A documentation-only change cannot promote a feature or close an evidence gap.

## 2. Approval matrix

| Category | Owner role | Distinct approver role | Extra requirement |
|---|---|---|---|
| `financial` | CFO / Finance Lead | Founder / Finance Lead | Dated assumption, definition, source status, confidence, upside/base/downside range; illustrative valuations only |
| `safety` | Chief AI Officer / Platform Security Lead | Architecture Review Board | Fail-closed action tiers, human release gates, responsible-drinking limits and test evidence |
| `regulatory` | Legal / Compliance Lead | Distinct counsel or compliance approver | No implied licence or jurisdiction activation; high-risk feature register unchanged unless evidence is signed |

Self-approval is not permitted. Where one person holds both roles in practice, a distinct second person must approve or the change remains blocked.

## 3. Required change record

Use identifier `CCR-2026-NNN` and record every field: `id`, `date`, `category`, `claim`, `priorValue`, `newValue`, `sourceRef`, `ownerRole`, `approverRole`, `evidenceRef`, `reviewDate`, `decision`. `evidenceRef` is `null` when no evidence exists; a null reference cannot support promotion language.

```text
CCR-2026-001 | 2026-11-21 | financial
Claim: illustrative 2034 GMV projection
Prior: unlabelled figure
New: modeled projection with dated assumption and Low confidence
Source: config/financial-assumptions.json
Owner: CFO / Finance Lead
Approver: Founder / Finance Lead
Evidence: null
Review date: 2026-11-21
Decision: permitted as Design target; no reported performance implied
```

The register currently has no populated change records. The example above illustrates the format only and is not an approval.

## 4. Required checks

Before merge, run `npm run claims:check`, `npm run docs:check`, `npm run financial:check`, `npm run forecasts:check`, `npm run gates:check` and `npm run launch:check`. The relevant domain gate must also pass: `ai:safety:check`, `responsible-drinking:check`, `security:check`, `data-governance:check`, `jurisdiction:check` or `pricing:check`, as applicable. Green local checks prove metadata parity only.

## 5. Retention of decision records

Change records are append-only governance evidence. Deletion is controlled by the legal-hold and retention rules in [`DATA_RETENTION_ARCHITECTURE.md`](./DATA_RETENTION_ARCHITECTURE.md); no production retention job is implemented.

## 6. Evidence gaps

No populated change record, named individual approver or signed review is attached. No external counsel opinion or regulator acknowledgement exists for any regulated claim.
