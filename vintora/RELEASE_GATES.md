# Vintora Release Gates — Phase 1 Only

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/release-gates.json`](./config/release-gates.json); checked by `npm run status:check`. No stage is satisfied by documentation alone and `promotionAllowed` remains false.

## 1. Gate stages

| Stage | Required evidence | Hosted evidence |
|---|---|---|
| `local-verify` | `npm run ci:verify`, `npm run verify` | `null` |
| `migration-contract` | `npm run db:ops:check`, `npm run db:migrations:test` | `null` |
| `repository-policy` | `npm run policy:check`, `npm run adr:check`, `npm run evidence:check`, `npm run fixtures:check`, `npm run claims-change:check`, `npm run status:check`, `npm run markdown:check`, `npm run schemas:check` | `null` |
| `security-and-supply-chain` | `npm run secrets:scan`, `npm run licenses:check`, `npm run artifacts:check`, `npm run sbom:check`, `npm run security:check` | `null` |
| `hosted-ci` | Six workflow definitions in `.github/workflows/` | `null` |
| `launch-approval` | `npm run launch:check`, `npm run jurisdiction:check`, `npm run gates:check` | `null` |

## 2. Blocking rules

1. A stage with null hosted evidence cannot promote the repository beyond Prototype.
2. A documentation-only change cannot satisfy a security, legal, reliability or operational gate.
3. `NODE_ENV=production` and `RUNTIME_PROFILE=production` remain rejected regardless of green checks.
4. No high-risk feature may change from blocked without signed legal/compliance evidence and a reviewed launch record.
5. The verdict stays NO-GO until every gate has independent evidence and explicit approval.

## 3. Workflow definitions

Workflows exist for typecheck/tests, governance, migrations, security, supply chain, build and release. See [`ci-typecheck-tests.yml`](./.github/workflows/ci-typecheck-tests.yml), [`ci-governance.yml`](./.github/workflows/ci-governance.yml), [`ci-migrations.yml`](./.github/workflows/ci-migrations.yml), [`ci-security.yml`](./.github/workflows/ci-security.yml), [`ci-supply-chain.yml`](./.github/workflows/ci-supply-chain.yml), [`ci-build.yml`](./.github/workflows/ci-build.yml) and [`release.yml`](./.github/workflows/release.yml). Definitions are not hosted results; see [`EVIDENCE_INDEX.md`](./EVIDENCE_INDEX.md).

## 4. Evidence gaps

No hosted CI result, signed release, load test, penetration test, DPIA or counsel approval is attached. No promotion decision record exists.
