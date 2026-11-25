# EMDO Medical — deployment and environment instructions

> **Maturity: Prototype.** Local and CI deployment procedures only. No hosted staging or production environment is provisioned or claimed.

## 1. Repository layout

```
platform/
  apps/api/                 NestJS API (foundation, EMDO Record, EMDO Care, EMDO Assist, EMDO Insight aggregate API)
  apps/admin/               Next.js Super Admin prototype (aggregate views only)
  packages/shared/          Shared types, status register, FHIR validation
  docs/                     API, security, deployment, backup/DR, implementation status
  .env.example              Configuration template (no secrets)
  docker-compose.yml        Local PostgreSQL + API
  Dockerfile                API image
```

## 2. Prerequisites

- Node.js 20+ (verified locally on Node 26) and npm.
- PostgreSQL 13+ with `gen_random_uuid()` available.
- Docker is optional; a local PostgreSQL installation works.

## 3. Environments

| Environment | Purpose | Country mode | Data rules |
|---|---|---|---|
| `development` | Local feature work | `sandbox` | Synthetic/local data only |
| `test` | Automated unit + integration tests | `sandbox` | Throwaway `emdo_test` database; truncated before e2e |
| `staging` | Config prepared, not provisioned or deployed | `sandbox` | Synthetic data only; see [`STAGING.md`](STAGING.md) |
| `production` | Planned, blocked pending launch gate | `approved` | Real data only after legal/clinical/security sign-off |

`validateEnvironment` rejects production startup unless `COUNTRY_PROFILE_MODE=approved`. No approved country profile ships with this repository. It also rejects every `AI_MODEL_BACKEND` other than `offline` and rejects production entirely: only the offline deterministic prototype exists, and no model provider, DPA or residency decision has been approved or tested.

## 4. Local setup

```powershell
cp .env.example .env
# Replace DATA_ENCRYPTION_KEY, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET with generated values:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # data key
# node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"   # each JWT secret
npm install
npm run migrate
npm run bootstrap
npm run dev
```

`npm run bootstrap` creates only the `SANDBOX` country profile and, if `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` are set, a platform administrator. It seeds no patients, clinicians, medicines or clinical content.

The sandbox profile contains `verificationSources: [{ "kind": "manual", "enabled": true }]` for non-clinical testing only. Verification to `verified` fails closed in `NODE_ENV=production` or an `approved` country profile unless a source is explicitly marked `authoritative: true` and `tested: true`. No such adapter ships with this repository.

`.env.example` sets `AI_MODEL_BACKEND=offline`. This adapter performs deterministic policy-safe responses in-process and makes no network call. Do not change the value to a provider name; startup will reject it. Voice and multilingual runtime are design-only and require a separate tested provider decision.

M10 EMDO Insight adds no environment variables, external service or database migration. It uses fixed aggregate SQL against existing tested tables and returns explicit unavailable evidence for unbuilt source modules. D-026 added a local Next.js Super Admin prototype with two portal-only environment values; it does not add a business data source.

To run the portal locally, put the following in `apps/admin/.env.local` (gitignored) or export them in the process environment, then start the API first:

```dotenv
INSIGHT_API_BASE_URL=http://127.0.0.1:3000
ADMIN_SESSION_SECRET=<generated 32-byte base64url value>
```

```powershell
npm run dev:admin   # http://127.0.0.1:3001
```

Generate the portal secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Missing or placeholder values fail closed. Never expose the local portal publicly; see [`SUPER_ADMIN_PORTAL.md`](SUPER_ADMIN_PORTAL.md).

Provider-neutral container manifests are prepared in [`STAGING.md`](STAGING.md). They are configuration artefacts only: no hosted staging environment is provisioned, no image is published and no maturity state is promoted.

To exercise the human approval workflow in a non-clinical environment, create two `compliance_officer` accounts and one `clinician` account through `POST /v1/identity/users`. The reviewer who opens a review cannot approve it.

`npm run bootstrap` is idempotent for the country profile but will fail if the administrator identifier already exists; change the identifier or delete the test account when re-running.

## 5. Docker Compose

```powershell
docker compose up -d db
npm run migrate
npm run bootstrap
docker compose up --build api
```

The compose file binds the API to localhost only. TLS termination belongs at a reverse proxy/ingress; never expose the plain HTTP port publicly.

## 6. Database migrations

- Migrations are ordered SQL files in `apps/api/src/database/migrations/`.
- Applied migrations are recorded in `schema_migrations`.
- Run with `npm run migrate`. Migrations are not run automatically at application startup.
- A migration must be reviewed with a decision-log reference before merge.

## 7. Test commands

```powershell
npm run typecheck
npm run build
npm test          # unit tests for shared, API and portal; no database
npm run test:e2e  # integration tests against TEST_DATABASE_URL
```

E2E tests truncate the test database at setup. Never point `TEST_DATABASE_URL` at a database containing data you need.

## 8. Production build (target, not activated)

```powershell
npm run build
npm run start
# Separate process only after a deployment/security decision; not authorised here:
# npm run start:admin
```

Deploy behind HTTPS ingress with:
- secrets from a managed secret store, not `.env` files;
- network isolation for PostgreSQL;
- read-only root filesystem and non-root container user where possible;
- centralised, PHI-safe logging;
- monitoring on `/health/ready`, failed verification events and audit anomalies.

## 9. Operational dependencies (not implemented here)

- Hosted staging/production environments and CI credentials.
- KMS/HSM integration and key-rotation job.
- Rate limiting, WAF rules, SIEM and alert routing.
- Backup scheduler and restore drill (see `BACKUP_AND_DR.md`).
- DSAR/retention jobs and legal-hold workflow.
- All Flutter mobile apps; clinic, hospital, pharmacy, laboratory and corporate Next.js portals; their release pipelines.
- Hosted Super Admin deployment with MFA, rate limiting, session revocation and ingress security review.

## 10. Rollback

Application rollback: redeploy the previous image. Database rollback requires a reviewed, tested down-migration; none exists yet. Until down-migrations are implemented, never apply an unreviewed migration to a database containing real data.
