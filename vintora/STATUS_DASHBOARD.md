# Vintora Status Dashboard — Static Phase 1 View

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/status-dashboard.json`](./config/status-dashboard.json); checked by `npm run status:check`. This is a repository status register, not a running status page, metrics endpoint or hosted CI badge.

## 1. Overall status

| Field | Value |
|---|---|
| Scope | Phase 1 gates only |
| Verdict | NO-GO |
| Prototype mode | true |
| Public launch | false |
| Last reviewed | 2026-11-25 |
| External status page | `null` — none attached |

## 2. Check register

| ID | Gate | Command | Result evidence |
|---|---|---|---|
| verify | API typecheck and shared tests | `npm run verify` | [45342913176](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45342913176) |
| migrations | Migration contract | `npm run db:migrations:test` | [45342913172](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45342913172) |
| domain | Offline domain selftests | `npm run catalogue:selftest && npm run accessories:selftest && npm run africa:selftest` | [45342913176](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45342913176) |
| api | API smoke suite (requires live API) | `npm run test:smoke` | [45342913176](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45342913176) |
| aggregate | Aggregate Phase 1 verification | `npm run ci:verify` | [45342913226](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45342913226) |
| build | Build and SBOM parity | `npm run ci:build` | [45342913234](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45342913234) |

## 3. Health checks

- Database: `npm run db:health` checks connectivity, required extensions and recorded embedding mode.
- API: `npm run api:health` checks `GET /health`, database status, runtime profile and embedding consistency.
- Combined live-stack check: `npm run health:check` runs both database and API health checks; it requires a running local stack and is not part of the offline gates.
- Container health checks are defined in [`docker-compose.yml`](./docker-compose.yml) for db, redis and api.
- No hosted metrics, uptime history, `/ready` or `/live` endpoint is attached; see [`API_POLICY.md`](./API_POLICY.md) for required release design.

## 4. Measurement boundary

Hosted Phase 1 CI run URLs are attached for commit `701b419` as gate-parity evidence only. SLO pipeline, error-budget measurement, deployment history, uptime history, and p95/p99 by route remain not implemented/attached. Capacity figures in [`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md) are targets only. GitHub branch protection is enabled on `main` with 15 required Phase 1 check contexts, and code scanning is enabled through Vintora-managed advanced CodeQL/Trivy workflows with blocking SARIF uploads; GitHub default setup is disabled to avoid conflicting analyses. `enforce_admins` is false and no GitHub DCO app or independent reviewer is configured, so direct admin maintenance can bypass reviews; DCO sign-off remains a CI policy check only. Release stages and evidence refs are listed in [`RELEASE_GATES.md`](./RELEASE_GATES.md).

## 5. Review

The Release Manager reviews this dashboard at each gate change and quarterly. A green check proves Phase 1 gate parity only and never changes the NO-GO verdict.
