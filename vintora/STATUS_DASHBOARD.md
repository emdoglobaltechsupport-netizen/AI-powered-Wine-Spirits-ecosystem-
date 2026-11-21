# Vintora Status Dashboard — Static Phase 1 View

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/status-dashboard.json`](./config/status-dashboard.json); checked by `npm run status:check`. This is a repository status register, not a running status page, metrics endpoint or hosted CI badge.

## 1. Overall status

| Field | Value |
|---|---|
| Scope | Phase 1 gates only |
| Verdict | NO-GO |
| Prototype mode | true |
| Public launch | false |
| Last reviewed | 2026-11-21 |
| External status page | `null` — none attached |

## 2. Check register

| ID | Gate | Command | Result evidence |
|---|---|---|---|
| verify | API typecheck and shared tests | `npm run verify` | `null` locally attached; command defined |
| migrations | Migration contract | `npm run db:migrations:test` | `null` locally attached; command defined |
| domain | Offline domain selftests | `npm run catalogue:selftest && npm run accessories:selftest && npm run africa:selftest` | `null` locally attached; command defined |
| api | API smoke suite (requires live API) | `npm run test:smoke` | `null` locally attached; command defined |
| aggregate | Aggregate Phase 1 verification | `npm run ci:verify` | `null` locally attached; command defined |
| build | Build and SBOM parity | `npm run ci:build` | `null` locally attached; command defined |

## 3. Health checks

- Database: `npm run db:health` checks connectivity, required extensions and recorded embedding mode.
- API: `npm run api:health` checks `GET /health`, database status, runtime profile and embedding consistency.
- Combined live-stack check: `npm run health:check` runs both database and API health checks; it requires a running local stack and is not part of the offline gates.
- Container health checks are defined in [`docker-compose.yml`](./docker-compose.yml) for db, redis and api.
- No hosted metrics, uptime history, `/ready` or `/live` endpoint is attached; see [`API_POLICY.md`](./API_POLICY.md) for required release design.

## 4. Measurement boundary

SLO pipeline, error-budget measurement, hosted CI results and p95/p99 by route are not implemented or attached. Capacity figures in [`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md) are targets only. Release stages and their null evidence are listed in [`RELEASE_GATES.md`](./RELEASE_GATES.md).

## 5. Review

The Release Manager reviews this dashboard at each gate change and quarterly. A green check proves Phase 1 gate parity only and never changes the NO-GO verdict.
