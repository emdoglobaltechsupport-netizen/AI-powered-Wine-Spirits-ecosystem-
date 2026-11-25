# Vintora Release Gates — Phase 1 Only

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/release-gates.json`](./config/release-gates.json); checked by `npm run status:check`. No stage is satisfied by documentation alone and `promotionAllowed` remains false.

## 1. Gate stages

| Stage | Required evidence | Hosted evidence |
|---|---|---|
| `local-verify` | `npm run ci:verify`, `npm run verify` | [45657006563](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45657006563) |
| `migration-contract` | `npm run db:ops:check`, `npm run db:migrations:test` | [45657006702](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45657006702) |
| `repository-policy` | `npm run policy:check`, `npm run adr:check`, `npm run evidence:check`, `npm run fixtures:check`, `npm run claims-change:check`, `npm run status:check`, `npm run markdown:check`, `npm run schemas:check` | [45657006666](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45657006666) |
| `security-and-supply-chain` | `npm run secrets:scan`, `npm run licenses:check`, `npm run artifacts:check`, `npm run sbom:check`, `npm run security:check` | [45657006542](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45657006542) |
| `hosted-ci` | Six workflow definitions in `.github/workflows/` | [45657006563](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45657006563) |
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

Hosted Phase 1 CI run URLs are attached for commit `7185294` as gate-parity evidence only. Signed release, load test, penetration test, DPIA, counsel approval, and launch/promotion decision records are not attached. GitHub branch protection is enabled on `main` with 15 required Phase 1 check contexts, and code scanning is enabled through Vintora-managed advanced CodeQL/Trivy workflows with blocking SARIF uploads; GitHub default setup is disabled to avoid conflicting analyses. `enforce_admins` is false and no GitHub DCO app or independent reviewer is configured, so direct admin maintenance can bypass reviews; DCO sign-off remains a CI policy check only. `promotionAllowed` remains false and verdict remains NO-GO.
