# Vintora Documentation Ownership and Consistency

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This model prevents drift across the 27 design deliverables. Machine authority: [`config/docs-governance.json`](./config/docs-governance.json), checked by `npm run docs:check`. It does not certify that targets are achievable or that any claim is true.

## Authority chain

[`_canon.md`](./_canon.md) is the single source of truth for names, numbers and timeline. [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) owns the RFC and four-eyes change process. `config/docs-governance.json` holds the machine-readable schemas, owner roles and version dates. `README.md` renders the generated inventory between `<!-- docs-governance:start -->` and `<!-- docs-governance:end -->`. Regenerate it with `npm run docs:check -- --write-docs`.

## Canonical schemas

| Schema | Value | Source |
|---|---|---|
| Modules | Exactly 10: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards | `packages/shared/src/index.ts#CANON.modules` |
| Internal layers | 4: Admin, Global Payments, AI Marketing Automation, Ultimate AI TechOps | `CANON_GOVERNANCE.md` |
| Markets | 3 phase-1 (`US`, `UK`, `SG`); 14 Africa `design_target` markets, `blocked`, `unassigned` | `config/jurisdiction-compliance.json` |
| Numbers | 19 Admin workspaces, 24 TechOps agents, 27 deliverables, 12 demo SKU rows, 0 licensed feeds, 0 verified rows, 1,850 acquisition target, 10M+ SKU target by 2034, 100M users, 1.2M orders/day peak, 50k edge RPS, p95 200 ms, 99.99% availability | `config/catalogue-provenance.json`, `config/capacity-model.json`, `CANON.scale` |
| Status | `Design`, `Prototype`, `Pilot`, `Production`; verdict `NO-GO`; `production-ready` reserved for evidenced components; all others are not production-ready | `config/implementation-status.json` |

A number is never copied into a second register by hand. Derived docs reference the canonical schema or the generated block; a conflicting duplicate fails CI.

## Ownership and review

Every deliverable has an `ownerRole`, `version`, `versionDate` and `reviewRequired: true` in the register. Roles are not named individuals: an approval records the role plus the named person filling it at review time. A canon change requires a distinct second approver, Architecture Review Board review for architecture changes and a Compliance/Legal reviewer for regulated claims. The Release Manager runs `npm run ci:verify` and the generated-count checks before merge. No role may self-approve or waive the NO-GO posture alone.

The README is the onboarding entry point only. Its owner is the Developer Experience / Platform Lead with a **monthly implementation review**; investor documentation is owned by the Founder / Finance Lead and regulatory documentation by the Legal / Compliance Lead, both with **quarterly external reviews**. `config/docs-governance.json#readmeReview` pins the last-reviewed date, canonical versions (`canon 1.0`, `policies v1`, `API v1`) and the PR checks (`docs:check`, `test-counts:check`, `claims:check`, `policy:check`) plus a distinct approver. No documentation-only change promotes a feature or approves a claim.

## Validation

`npm run docs:check` enforces four things:

1. All relative Markdown links in `README.md` resolve to a file or directory.
2. Canonical numbers repeated in scanned docs match the register (10 modules, 19 workspaces, 24 agents, 27 deliverables).
3. The generated README inventory matches the schemas exactly; `--write-docs` regenerates it.
4. Every deliverable file exists and its owner role, version and version date are present and dated.

`npm run test-counts:check` separately guards generated test counts; `npm run claims:check` guards banned overclaims; `npm run forecasts:check`, `npm run financial:check`, `npm run jurisdiction:check` and `npm run pricing:check` guard their own registers. All run in `npm run ci:verify`.

## Evidence gaps

No named individual holds a role, no review signature record is attached to a deliverable version and generated counts prove metadata parity only. A green docs check is not a review, a reality check or launch clearance.
