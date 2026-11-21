# Contributing to Vintora

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Contributions must preserve the Phase 1 boundary. Machine authority: [`config/repository-policy.json`](./config/repository-policy.json); checked by `npm run policy:check`.

## 1. Licence and sign-off

By submitting a contribution you certify that you have the right to submit it and that it is licensed under [Apache-2.0](./LICENSE) unless you have a written agreement with the maintainers. Every commit must include a Developer Certificate of Origin sign-off:

```text
Signed-off-by: Name <email@example.com>
```

The Apache License grants copyright and patent rights where it can. It does **not** grant use of the Vintora name, trademarks, product names or brand assets; see [`NOTICE`](./NOTICE). The repository licence does not grant rights to demo data, licensed supplier data, personal data or third-party assets.

## 2. Before opening a pull request

1. Keep the canonical ten modules, four internal layers, 19 Admin workspaces and 24 ADM-19 agents unchanged unless an RFC and four-eyes approval is attached.
2. Keep `Prototype mode — no real orders are placed.`, `NODE_ENV=production` rejection and the NO-GO verdict intact.
3. Run `npm run ci:verify`, `npm run ci:build`, `npm run test-counts:check`, `npm run claims:check` and `npm run claims-change:check`. A hosted CI result is not assumed from a local green run.
4. If test sources or documentation inventories change, run `npm run test-counts:generate`, `npm run test-counts:docs` and `npm run docs:check -- --write-docs`. Never hand-edit generated counts or the README inventory.
5. Describe what changed, what evidence is attached, what remains a target or estimate, and which owner role reviewed regulated or investor-facing claims. Keep the change secret-free; no credential, token or private key belongs in the diff.

A distinct reviewer must approve each PR; self-approval is not permitted. Changes to canon, forecasts, high-risk feature status, launch language, security gates or regulated claims require the relevant owner role plus a second approver. Roles are not named individuals in this workspace.

## 3. What will be rejected

- Fixed, reused or real credentials in source, fixtures, workflows or documentation.
- Real external calls to age, KYC, sanctions, PSP, marketing, custody, model or supplier providers.
- Removal or weakening of a fail-closed profile, adapter, launch, evidence, consent or provenance gate.
- Unlabelled forecasts, unverified catalogue assertions, jurisdiction activation or readiness overclaims.
- Stale generated counts, documentation inventories or conflicting canonical numbers.
- Assets, datasets or code without licence, provenance and permitted-use evidence.
- Regulated claims without a named legal/compliance reviewer and review date.
- Personal data, licensed catalogue rows or real proprietary data in fixtures.

## 4. Code and documentation conventions

- Keep first-party TypeScript/JavaScript small, modular and dependency-light; no new runtime dependency without purpose, licence check, SBOM refresh and maintainer review.
- Every new API boundary uses the existing Zod validation and error helpers.
- Every new high-risk feature registers as blocked until evidence exists; do not promote a feature by documentation alone.
- Mark every catalogue record with a source class (`seed`, `licensed`, `verified` or `live`), source reference, freshness and purchasability. Demo rows are never live inventory.
- Use `Design`, `Prototype`, `Pilot` or `Production` precisely. `production-ready` is reserved for evidenced components; every current component is `not production-ready`, and `NO-GO` remains the repository verdict.
- Link new governed documents from [`README.md`](./README.md) and add them to [`config/docs-governance.json`](./config/docs-governance.json) when they carry canonical claims.
- Architecture changes require an ADR under [`ADR_PROCESS.md`](./ADR_PROCESS.md), using [`adr/TEMPLATE.md`](./adr/TEMPLATE.md); financial, safety and regulatory claim changes require a record under [`CLAIMS_CHANGE_MANAGEMENT.md`](./CLAIMS_CHANGE_MANAGEMENT.md).

## 5. Security

Do not open a public issue for a vulnerability. Use the private paths in [`SECURITY.md`](./SECURITY.md). Never include a proof of concept that contacts a system you do not own or have permission to test. Secret scanning, licence checks, artifact pin checks and SBOM freshness are mandatory gates; see [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md).

## 6. Code of conduct

All participants are expected to follow [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). Harassment, discriminatory language and disclosure of private information are not acceptable.
