# Vintora setup guide and environment matrix

> **MATURITY: PHASE 1 PROTOTYPE. NO-GO for public launch.**
> This is a local development and demonstration setup. A green setup proves **Phase 1 gates only**. It never grants launch permission.

This guide records how to reproduce the Phase 1 environment, what has actually been exercised, and how to recover from known failures. It deliberately separates **verified locally**, **configured in CI**, and **not executed**; do not describe an untested platform as validated.

## 1. Known-good environment matrix

Machine-readable authority: [`config/setup-environment-matrix.json`](./config/setup-environment-matrix.json). Check it with `npm run setup:doctor -- --offline`.

| Matrix id | OS / path | Node | npm | PostgreSQL | Evidence status |
|---|---|---|---|---|---|
| `windows-manual` | Windows 11, manual host PostgreSQL | 26.13.1 | 11.20.0 | 16.16 | **Verified locally.** `db:setup`, `ci:verify`, `ci:build`, `test:smoke` and browser `?selftest=1` all passed in this workspace. |
| `windows-docker` | Windows 11, Docker Compose | 26.13.1 | 11.20.0 | digest-pinned `pgvector/pgvector:pg16` | **Partially checked locally.** `docker compose config --quiet` and `docker info` passed in the latest `setup:doctor` run. An earlier HTTP 500 from the `dockerDesktopLinuxEngine` pipe is documented below. Full `npm run setup` container startup is not evidenced here. |
| `linux-ci` | `ubuntu-latest`, PostgreSQL 16 service containers | 24.x and 26.x | npm bundled with `setup-node` | stock 16 service and digest-pinned `pgvector/pgvector:pg16` | **CI target configured.** `.github/workflows/ci-migrations.yml` runs fresh, idempotency, rollback, upgrade and mode-health checks in both embedding modes; `.github/workflows/ci-typecheck-tests.yml` runs the supported Node matrix. Hosted run results are not attached to this workspace. |
| `macos-manual` | macOS, manual PostgreSQL or Docker Compose | 24.x or 26.x LTS (baseline 26.13.1) | 11.x | 16 | **Not executed.** No clean macOS run has been recorded. |
| `linux-manual` | Linux desktop/server, manual PostgreSQL or Docker Compose | 24.x or 26.x LTS (baseline 26.13.1) | 11.x | 16 | **Not executed.** Only the `ubuntu-latest` CI target is configured. |

**Supported toolchain:** Node 24.x or 26.x LTS with npm 11.x; PostgreSQL 16. **Baseline:** Node 26.13.1, pinned in `.nvmrc` and `.node-version`; npm 11.20.0 was used locally. **Tested:** Node 26.13.1 / npm 11.20.0 locally; Node 24.x and 26.x are CI targets but no hosted result is attached here. **Minimum:** Node 24.0.0 / npm 11.0.0. **Unsupported:** Node 22.x and older (below this project's dependency floor even where upstream LTS), odd-numbered Node 25.x, Node 27.x and later alphas, and npm outside 11.x. `package.json` engines and `.npmrc` (`engine-strict=true`) enforce the supported range at install. Repository package version is `0.1.0`; all `@vintora/*` workspace versions are `0.1.0`. npm scripts are not separately versioned; their behaviour is pinned by this repository snapshot and `package-lock.json`.

## 2. Core prerequisites, optional dependencies and setup variants

### 2.1 Core prerequisites (all variants)

Run every command from `vintora/`, the directory containing `package.json`, `.env.example` and `docker-compose.yml`. `.env.example` is committed and credential-free; a pre-existing `.env` is **not** required. If `.env.example` is missing, restore it from the repository archive before continuing; do not recreate it from memory or copy values from another host.

Verify the directory before installing:

```bash
# macOS / Linux (bash, zsh)
test -f package.json && test -f .env.example && test -f docker-compose.yml && echo root-ok
```

```powershell
# Windows PowerShell
if ((Test-Path package.json) -and (Test-Path .env.example) -and (Test-Path docker-compose.yml)) {
  'root-ok'
} else {
  throw 'Run commands from the vintora/ directory.'
}
```

Core tools: Node 24.x or 26.x LTS, npm 11.x and this repository snapshot. The examples below use portable `npm` syntax; use the spelling for your shell:

| Shell | Command spelling |
|---|---|
| Windows PowerShell | `npm.cmd ...` (not `npm.ps1`; see section 7) |
| Windows `cmd.exe` | `npm ...` |
| macOS / Linux `bash` or `zsh` | `npm ...` |

`npm run setup` and `npm run setup:verify` choose the correct shim internally. Install once from the repository root:

```bash
node --version
npm --version
npm install --legacy-peer-deps --no-audit --no-fund
npm run setup:doctor -- --offline
```

Expected: Node and npm versions print, install completes, and the doctor ends with `Setup doctor: 10 passed, 0 warning(s), 0 failure(s).` A failure here is a repository/directory or tool-version problem; do not continue to the database steps. For common messages, see section 7.

### 2.2 Optional dependencies by setup variant

| Variant | Additional dependency | Why |
|---|---|---|
| A — Docker Compose (recommended) | Docker Engine/Desktop with Compose v2 | Supplies digest-pinned PostgreSQL 16 + `pgvector` and Redis 7. No host database install. Full container startup is configured but not evidenced locally. |
| B — Host PostgreSQL (verified local fallback) | PostgreSQL 16 with `citext`, `pgcrypto` and `pg_trgm`; `pgvector` optional | Used by the Windows manual path already exercised in this workspace. A temporary superuser DSN is needed once to create/align the local role and extensions. |
| Offline/static | None beyond core tools | `npm run setup:verify` runs repository checks; `npm run prototype` serves the zero-backend UI. |

`npm run setup` generates local-only `.env` secrets, starts `db`, `redis`, `api` and `prototype`, waits for health, applies migrations and the explicit local/test identity seed, then runs `ci:verify`, `ci:build` and `test:smoke`. Stop with `npm run dev:down`.

### 2.3 Variant A — Docker Compose

```bash
npm run setup:doctor -- --offline
npm run setup
npm run api:health
```

Expected output includes `Created .env` or `Updated .env` (generated values are never printed), `docker compose up -d --build`, `API did not become healthy` only on failure, and finally `Vintora local verification complete.` plus `NO-GO for public launch. Prototype mode — no real orders are placed.` `npm run api:health` prints `API health: ok (runtimeProfile=local, runtimeBoundaryOk=true).` after the stack starts.

If Docker reports an HTTP 500 from `dockerDesktopLinuxEngine`, restart Docker Desktop and use the manual path until the daemon is healthy; `docker compose config --quiet` alone does not prove daemon health. For the `npm.ps1 cannot be loaded` error, use `npm.cmd` in PowerShell. Stop the stack with `npm run dev:down`.

### 2.4 Variant B — Manual host PostgreSQL

**Step 1 — generate the environment.** Do this before creating the role so the role password is the generated `POSTGRES_PASSWORD`, not a value copied from documentation.

```bash
npm run setup:env
npm run setup:doctor -- --offline
```

Expected: `Created .env` (or `Updated .env`), a count of generated values, and the ten offline doctor passes. No secret value is printed.

**Step 2 — create/align the role, database and extensions.** Set `VINTORA_PG_ADMIN_URL` only in the current shell. It is a transient superuser DSN, **not** a `.env` key and never a committed value. Enter the full DSN at the prompt so it is not echoed:

```bash
# macOS / Linux (bash, zsh)
read -rsp 'Postgres admin DSN: ' VINTORA_PG_ADMIN_URL; export VINTORA_PG_ADMIN_URL
npm run db:configure
unset VINTORA_PG_ADMIN_URL
```

```powershell
# Windows PowerShell
$secure = Read-Host 'Postgres admin DSN' -AsSecureString
$env:VINTORA_PG_ADMIN_URL = [System.Net.NetworkCredential]::new('', $secure).Password
npm.cmd run db:configure
Remove-Item Env:VINTORA_PG_ADMIN_URL
```

`npm run db:configure` reads the generated values from `.env`, creates or aligns the `vintora` role, creates the database when absent and installs `citext`, `pgcrypto` and `pg_trgm`. Expected output:

```text
Local DB configured: role=vintora database=vintora extensions=citext,pgcrypto,pg_trgm ready
Generated password was not printed. Run npm run db:health to verify the connection.
```

An optional `pgvector` warning is expected when that extension is unavailable; migrations then use `jsonb`. The equivalent SQL, for an operator who prefers `psql`, is below. Use the generated `POSTGRES_PASSWORD` from `.env` programmatically; never paste a fixed example password.

```sql
-- Run as a superuser in the `postgres` database.
CREATE ROLE vintora LOGIN PASSWORD '<generated POSTGRES_PASSWORD from .env>';
CREATE DATABASE vintora OWNER vintora;
-- Then connect to `vintora` and run:
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Optional: CREATE EXTENSION IF NOT EXISTS vector;
```

**Step 3 — verify the database, migrate and seed.**

```bash
npm run db:health
npm run db:setup
npm run setup:doctor -- --ci
npm run db:seed:dev
```

Expected: `Database health: PostgreSQL 16.x ready; required extensions present.`, `Embedding mode: <pgvector|jsonb> (...)`, `[db] setup complete`, `Setup doctor: 16 passed, 1 warning(s), 0 failure(s).` (the warning is optional `pgvector`), and `development-only identity seed complete`. `npm run setup:doctor -- --ci` also verifies the migration count and recorded embedding mode. If extension or migration checks fail, rerun `npm run db:configure` with a superuser DSN or run the SQL above, then `npm run db:setup`.

**Step 4 — start and verify the API.** Use a second terminal for the health command:

```bash
# Terminal 1
npm run dev:api
```

```bash
# Terminal 2
npm run api:health
```

Expected: `API health: ok (runtimeProfile=local, runtimeBoundaryOk=true).` followed by `Embedding mode: <pgvector|jsonb> (configured=auto, consistent=true).` Open <http://localhost:4000/>, <http://localhost:4000/health> and <http://localhost:4000/?selftest=1>. The API serves the JSON surface under `/v1`. If port 4000 is occupied, set `PORT` for a manually started API or `API_PORT` for the Compose host mapping in `.env` (run `npm run setup:env` afterwards) and use the matching `API_BASE_URL` for `npm run api:health`.

### 2.5 Offline and static variants

```bash
npm run setup:verify   # regenerate/fill .env, then all offline checks
npm run prototype      # zero-backend storefront at http://localhost:8123/
```

These variants do not prove database or API readiness; use the health checks above for that.

## 3. Database bootstrap behaviour

See [`DATABASE_OPERATIONS.md`](./DATABASE_OPERATIONS.md) for the command-separation, checksum, backup/restore and rollback contract before running any database command.

- Compose `db` uses `pgvector/pgvector:pg16` pinned by digest in `config/artifact-policy.json`; host ports are `POSTGRES_PORT` and `REDIS_PORT`.
- The API container waits for `db` and `redis` health checks before starting; `prototype` waits for API health.
- `npm run db:setup` is idempotent and migrations-only. It creates `schema_migrations`, applies only new `packages/db/migrations/*.sql` files and re-uses source-labelled demo catalogue data.
- `npm run db:seed:dev` is the only identity seed path. It requires `ALLOW_DEMO_SEED=true`, generated seed passwords, and the resolved runtime profile `local` or `test`; `staging` and `production` fail closed. Passwords are generated locally and live only in gitignored `.env`.
- `CATALOGUE_SOURCE=demo` serves 12 labelled seed rows. `CATALOGUE_SOURCE=verified` fails closed until a rights-evidence adapter exists.
- No real provider, PSP, age service, KYC feed, sanctions list, advertising platform or licensed supplier feed is contacted.

### 3.1 Embedding storage modes and fallback

`EMBEDDING_MODE` is an explicit configuration guard, not a launch approval:

| Value | Behaviour |
|---|---|
| `auto` (default) | Use pgvector when `CREATE EXTENSION IF NOT EXISTS vector` succeeds; otherwise use the jsonb fallback. Runtime capability and recorded storage are reported by `/health`. |
| `pgvector` | Fail migrations closed if the extension cannot be installed. Use when the environment is expected to have native vector support. |
| `jsonb` | Force the portable fallback even when pgvector is installed. Use for disposable compatibility tests or intentionally jsonb-only local databases. An existing vector-typed schema is rejected rather than silently re-labelled. |

The migration runner records the selected mode in `schema_migration_metadata` (`key = 'embedding_mode'`), stamps every row in `schema_migrations` with `embedding_mode`, and backfills pre-existing rows from the physical `skus.embedding` column type (the prototype column; the canonical `product_embeddings` table in `04-database-design.md` is a design target, not a Phase 1 table). Startup prints `Embedding mode: ...`; `GET /health` returns `embedding.mode`, `configuredMode`, `recordedMode`, `storageMode`, `extensionAvailable`, `consistent` and a short `detail`. `npm run db:health` and `npm run api:health` print the same mode. A mismatch between configured, recorded and physical modes is a setup error: use a fresh disposable database or align `EMBEDDING_MODE` with the existing schema.

**Fallback limits.** With pgvector, Phase 1 migrations keep native `vector(1536)` columns; the HNSW cosine index described in `04-database-design.md` is a design target and is not created by the 19 prototype migrations. With jsonb, the same numeric arrays are stored as JSON, `CREATE EXTENSION vector` and vector columns are replaced in the migration runner, and there is **no vector index and no cosine operator**. Prototype Sommelier responses remain deterministic and do not perform live embedding search in either mode, but search quality would differ: jsonb can only support exact or catalog-keyword scoring and is materially slower and larger as data grows. The fallback preserves schema compatibility for local demonstration; it is not an equivalent large-scale retrieval index and does not make the prototype launch-ready.

CI verifies both modes with `npm run db:migrations:test` against disposable schemas: fresh apply, second-pass idempotency, a deliberately failing upgrade that must roll back, a later valid upgrade, and health consistency. This is a Phase 1 migration contract check only.

Manual invocation is intentionally gated to a loopback database:

```bash
# macOS / Linux (bash, zsh)
VINTORA_MIGRATION_TEST=1 EXPECTED_EMBEDDING_MODE=jsonb npm run db:migrations:test
```

```powershell
# Windows PowerShell
$env:VINTORA_MIGRATION_TEST = '1'
$env:EXPECTED_EMBEDDING_MODE = 'jsonb'
npm.cmd run db:migrations:test
Remove-Item Env:VINTORA_MIGRATION_TEST, Env:EXPECTED_EMBEDDING_MODE
```

Use `EXPECTED_EMBEDDING_MODE=pgvector` only against a disposable pgvector-enabled database. The runner refuses non-loopback `DATABASE_URL` values.

## 4. Environment contract

`.env` is gitignored. `.env.example` is credential-free. Values below are safe defaults or placeholders; never commit a populated `.env`. The API validates the contract at boot and rejects `NODE_ENV=production`.

| Variable | Class | Safe example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Defaulted | `development` | Runtime mode. `staging` and `production` are gated; `production` is rejected. |
| `RUNTIME_PROFILE` | Defaulted | `local` | Explicit profile (`local`, `test`, `staging`, `production`). Must match `NODE_ENV`; production is blocked. |
| `PORT` | Defaulted | `4000` | API + storefront host/container port. |
| `WEB_ORIGIN` | Defaulted | `http://localhost:8123` | Allowed browser origin for CORS. |
| `POSTGRES_USER` | Optional | `vintora` | Compose/database user; also embedded into the generated `DATABASE_URL`. |
| `POSTGRES_DB` | Optional | `vintora` | Compose/database name; also embedded into the generated `DATABASE_URL`. |
| `POSTGRES_PASSWORD` | Required, generated | empty in template; generated locally | Local database password. Compose fails closed when empty. |
| `DATABASE_URL` | Required, generated | built from user/password/port/DB; never printed by setup | Host-side CLI connection; regenerated when its inputs change. Compose rewrites the host to `db`. |
| `EMBEDDING_MODE` | Defaulted | `auto` | Migration embedding storage guard: `auto` detects pgvector, `pgvector` fails closed without it, `jsonb` forces the portable fallback. Recorded in `schema_migration_metadata` and exposed by `/health`. |
| `POSTGRES_PORT` | Optional | `5432` | Host port mapping for PostgreSQL; `DATABASE_URL` is regenerated to match. |
| `REDIS_PORT` | Optional | `6379` | Host port mapping for Redis. |
| `API_PORT` | Optional | `4000` | Host port mapping for the API. |
| `PROTOTYPE_PORT` | Optional | `8123` | Host port mapping for the static prototype. |
| `SESSION_SECRET` | Required, generated | empty in template; generated locally | Session configuration secret; 32+ characters enforced at boot. |
| `SESSION_TTL_HOURS` | Defaulted | `12` | Session lifetime in hours. |
| `COOKIE_SECURE` | Defaulted | `false` | Set only behind HTTPS; `production` requires `true` but remains rejected. |
| `RATE_LIMIT_WINDOW_MS` | Defaulted | `900000` | In-memory `express-rate-limit` prototype window. Production needs a distributed limiter. |
| `RATE_LIMIT_MAX` | Defaulted | `1000` | Prototype request ceiling per window. |
| `ALLOW_DEMO_SEED` | Defaulted | `false` in template; local setup sets `true` | Local/test-only demo-identity opt-in; blocked outside development profiles. |
| `SEED_ADMIN_EMAIL` | Defaulted | `admin@vintora.local` | Local-only, non-production admin identity email. |
| `SEED_ADMIN_PASSWORD` | Required, generated | empty in template; generated locally | Local-only admin password; generated first-run and never published. |
| `SEED_USER_EMAIL` | Defaulted | `demo@vintora.local` | Local-only, non-production collector identity email. |
| `SEED_USER_PASSWORD` | Required, generated | empty in template; generated locally | Local-only collector password; generated first-run and never published. |
| `AGE_VERIFICATION_PROVIDER` | Defaulted | `local` | Simulated adapter label; no certified age check occurs. |
| `KYC_PROVIDER` | Defaulted | `local` | Simulated adapter label; no licensed KYC occurs. |
| `PAYMENT_PROVIDER` | Defaulted | `simulated` | Simulated adapter label; any other value fails closed in checkout. |
| `MARKETING_PROVIDER` | Defaulted | `simulated` | Simulated adapter label; no ad platform is contacted. |
| `CUSTODY_PROVIDER` | Defaulted | `simulated` | Simulated adapter label; no custodian or settlement feed exists. |
| `AI_PROVIDER` | Defaulted | `deterministic` | Simulated adapter label for Sommelier/Admin responses. |
| `REAL_PROVIDER_OPT_IN` | Defaulted | `false` | Global opt-in for real adapters. Insufficient on its own; blocked by launch evidence. |
| `ALLOW_SIMULATED_PROVIDERS` | Defaulted | `true` | Permits simulated adapters in `staging`; local/test default to them. |
| `REAL_AGE_PROVIDER_OPT_IN` | Defaulted | `false` | Per-adapter opt-in for age assurance. Real use remains blocked. |
| `REAL_KYC_PROVIDER_OPT_IN` | Defaulted | `false` | Per-adapter opt-in for KYC. Real use remains blocked. |
| `REAL_PAYMENT_PROVIDER_OPT_IN` | Defaulted | `false` | Per-adapter opt-in for payment. Real use remains blocked. |
| `REAL_MARKETING_PROVIDER_OPT_IN` | Defaulted | `false` | Per-adapter opt-in for marketing. Real use remains blocked. |
| `REAL_CUSTODY_PROVIDER_OPT_IN` | Defaulted | `false` | Per-adapter opt-in for custody. Real use remains blocked. |
| `REAL_AI_PROVIDER_OPT_IN` | Defaulted | `false` | Per-adapter opt-in for AI inference. Real use remains blocked. |
| `CATALOGUE_SOURCE` | Defaulted | `demo` | Catalogue provenance label; `verified` is disabled. |
| `STRIPE_SECRET_KEY` | Optional | empty | Placeholder only; no PSP call in this build. |
| `ADYEN_API_KEY` | Optional | empty | Placeholder only; no PSP call in this build. |
| `REDIS_URL` | Defaulted | `redis://localhost:6379` | Reserved for later caching/queues. |
| `OPENAI_API_KEY` | Optional | empty | Placeholder only; no live model call. |
| `ANTHROPIC_API_KEY` | Optional | empty | Placeholder only; no live model call. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional | empty | Reserved for tracing. |
| `LOG_LEVEL` | Defaulted | `info` | Logging verbosity. |
| `VINTORA_LICENSED_FEED_PATH` | Optional | empty | Local licensed supplier feed path. |
| `VINTORA_LICENSED_FEED_LICENSE` | Optional | empty | Local licence/rights evidence reference. |
| `VINTORA_CATALOGUE_MIN_CONFIDENCE` | Defaulted | `0.7` | Minimum confidence for verified-import rows. |
| `VINTORA_OFF_BASE_URL` | Defaulted | `https://world.openfoodfacts.org` | Open Food Facts base URL; not contacted by setup. |
| `VINTORA_OFF_USER_AGENT` | Defaulted | `VintoraCatalogueIngest/0.1 (contact: replace-with-your-contact)` | Descriptive user agent for an explicitly requested import. |
| `VINTORA_OFF_PAGE_SIZE` | Defaulted | `100` | Open Food Facts page size. |
| `VINTORA_OFF_PAGES` | Defaulted | `5` | Open Food Facts page count. |
| `VINTORA_OFF_DELAY_MS` | Defaulted | `1000` | Polite delay between pages. |
| `VINTORA_WINE_ACCESSORIES_FEED_PATH` | Optional | empty | Local authorised accessories feed path. |
| `VINTORA_WINE_ACCESSORIES_MIN_CONFIDENCE` | Defaulted | `0.7` | Minimum confidence for accessories import. |
| `VINTORA_AFRICA_MARKETPLACE_CONFIG` | Optional | `packages/db/config/africa-marketplace.json` | Local registry source. |
| `VINTORA_AFRICA_BRANDS_CONFIG` | Optional | `packages/db/config/africa-brand-candidates.json` | Candidate brand source; no live integration. |
| `VINTORA_AFRICA_MPESA_CONSUMER_KEY` | Optional | empty | Gateway placeholder only; no call by setup. |
| `VINTORA_AFRICA_MPESA_CONSUMER_SECRET` | Optional | empty | Gateway placeholder only; no call by setup. |
| `VINTORA_AFRICA_CARD_GATEWAY_KEY` | Optional | empty | Gateway placeholder only; no call by setup. |
| `VINTORA_AFRICA_BANK_TRANSFER_KEY` | Optional | empty | Gateway placeholder only; no call by setup. |

Real provider credentials are not shipped. If a future release removes the prototype guard, each adapter/profile pair must use a distinct key named by the pattern `REAL_{PROVIDER}_KEY_{PROFILE}` (for example `REAL_PAYMENT_KEY_STAGING`). Reusing a generic key or a credential from another profile is rejected by the runtime boundary self-test.

`VINTORA_PG_ADMIN_URL` is a **transient shell variable only**, not a `.env` key: it supplies a superuser DSN to `npm run db:configure` and must be unset immediately afterwards. A password-free example shape is `postgres://postgres@localhost:5432/postgres`; supply the actual secret through your shell prompt or secret manager and never commit it.

## 5. Credential rotation and access revocation

Demo identities are **local/test development material only**. They are never valid for a shared host, staging or production.

1. On a throwaway local database, regenerate every generated secret with `npm run setup:env -- --force`. This rotates `POSTGRES_PASSWORD`, `DATABASE_URL`, `SESSION_SECRET`, `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD`. Values are written only to gitignored `.env` and are never printed.
2. Re-run `npm run db:seed:dev`. The development-only seed resets seeded password hashes; re-running `db:setup` alone does not rotate identities.
3. Revoke existing sessions. Call `POST /v1/auth/logout` and `POST /v1/admin/session/end` for active sessions, then delete stale local session rows with `DELETE FROM app_sessions; DELETE FROM admin_sessions;` against the throwaway database.
4. Restart the API so the new `SESSION_SECRET` takes effect, then re-run `npm run setup:doctor` and `npm run credentials:check`.
5. If any fixed or previously shared credential was used, treat it as exposed: discard the database and `.env`, regenerate again, and never copy the old value into a template, workflow, fixture or document.

Leaving a `.env` unchanged is not rotation. `npm run setup:env` preserves non-empty values unless `--force` is supplied; the doctor, config self-test, dev seed and scanners reject known fixed or reused seed credentials.

## 6. Setup diagnostic

`npm run setup:doctor` is a secret-safe readiness check. It prints key names and presence only, never values.

| Mode | Command | Checks |
|---|---|---|
| Offline | `npm run setup:doctor -- --offline` | Repository/tool versions, env contract completeness, docs coverage, secret-free template, production-guard flags. No network or DB access. Used by `ci:verify`. |
| CI | `npm run setup:doctor -- --ci` | Offline checks plus PostgreSQL version, required/optional extensions and migration count. Skips Docker and live API checks. Used by `ci-migrations.yml`. |
| Full | `npm run setup:doctor` | All checks, including Docker Compose config and `/health` reachability. API absence is a warning, not a failure. |
| Database health | `npm run db:health` | Focused PostgreSQL connection, version and required-extension check. Exits non-zero on failure; no Docker or API dependency. |
| API health | `npm run api:health` | Strict `/health` check that exits non-zero unless the API reports `db.ok=true`. |

The API also exposes `GET /health` with database status, resolved `runtimeProfile` and `runtimeBoundaryOk` from the startup self-test. It is a liveness/readiness signal only; `setup:doctor` is the setup-contract authority. Use `npm run db:health` and `npm run api:health` for step-by-step verification in section 2.

## 7. Known failures and recovery

| Symptom / exact message | Source | Recovery |
|---|---|---|
| `ERROR: request returned 500 Internal Server Error for API route and version http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.56/info` | Observed locally from a broken Docker daemon. | Restart Docker Desktop; verify the Linux engine. Until resolved, use the manual PostgreSQL path. `docker compose config --quiet` may still pass and does not prove daemon health. |
| `The paging file is too small for this operation to complete` | Observed in `docker info` plugin warnings. | Increase the Windows paging file or reduce concurrent builds; stop stale `node`/`tsx watch` processes before rerunning. |
| `Fatal process out of memory: Worklist::Segment::Create` or `Error: spawn UNKNOWN` | Observed locally when parallel npm/TypeScript work ran under low memory. | Run checks sequentially with `NODE_OPTIONS=--max-old-space-size=512`; shared tests use `--test-concurrency=1`. |
| `Invalid environment configuration:` followed by `DATABASE_URL is required`, `SESSION_SECRET must be at least 32 characters`, or a seed-password length error | API Zod config validation. | Run `npm run setup:env`; never hand-copy secrets. If a value already exists and is wrong, use `npm run setup:env -- --force` on a throwaway local environment only. |
| `Fixed demo credentials are not permitted`, `Seeded admin credentials are blocked outside local/test development`, or `DATABASE_URL password must match POSTGRES_PASSWORD` | Credential policy guard in the API, doctor or dev seed. | Regenerate local values with `npm run setup:env -- --force` on a throwaway environment, re-run `npm run db:seed:dev`, and follow section 5. Never reuse published or previously shared values. |
| `ERROR: type "citext" does not exist` (or `pgcrypto` / `pg_trgm`) | Manual PostgreSQL missing extensions. | Run the `CREATE EXTENSION IF NOT EXISTS ...` statements in section 2 as a database owner, then `npm run db:setup`. |
| `EADDRINUSE: address already in use :::4000` (or `5432`, `6379`, `8123`) | Port conflict. | Stop the conflicting service or set `API_PORT`, `POSTGRES_PORT`, `REDIS_PORT` or `PROTOTYPE_PORT` in `.env`; rerun `npm run setup:doctor`. |
| `Production startup is disabled: Vintora currently contains simulated payment, age/KYC and AI adapters only.` | `NODE_ENV=production` guard. | Keep `NODE_ENV=development`; production startup requires the launch gate and is intentionally unavailable. |
| `Verified catalogue adapter is not enabled in the prototype` | `CATALOGUE_SOURCE=verified`. | Set `CATALOGUE_SOURCE=demo`; real products enter only through the separate rights-evidence import path. |
| `.env.example not found at ...` | Command run outside `vintora/`, or the template was removed. | `cd vintora`, verify with the directory check in section 2.1, and restore the committed template from the repository archive. Do not create a hand-written template. |
| `npm.ps1 cannot be loaded` | Windows PowerShell script policy. | Use `npm.cmd` as shown in section 2, or run from `cmd.exe`/bash with `npm`. |
| `VINTORA_PG_ADMIN_URL is required for local DB role configuration` | Manual path attempted without a superuser DSN. | Set the transient variable with the hidden prompt in section 2.4, run `npm run db:configure`, then unset it. Never add this variable to `.env`. |
| `psql: command not found` | PostgreSQL client not on PATH. | Use the full PostgreSQL install path, for example `C:\Program Files\PostgreSQL\16\bin\psql.exe`, or run the SQL in pgAdmin. `npm run db:configure` avoids the client entirely. |
| `Database health failed: missing extension(s)` or `Setup doctor ... required extension ... is missing` | Manual database was not bootstrapped. | Rerun `npm run db:configure` with the transient superuser DSN, then `npm run db:health`. |
| `API health failed: .../health is not reachable` | API not started or a non-default port. | Start `npm run dev:api`, verify with `npm run api:health`, and set `API_BASE_URL` to the matching port when `API_PORT` was changed. |

## 8. Automated CI environment setup test

- `.github/workflows/ci-migrations.yml` runs on `ubuntu-latest` across Node 24.x/26.x and two PostgreSQL images: stock 16 (jsonb fallback) and digest-pinned `pgvector/pgvector:pg16` (native vector mode). Each job installs `citext`, `pgcrypto` and `pg_trgm`, applies migrations twice to prove idempotency, runs `npm run db:migrations:test` for fresh/upgrade/rollback/mode-health coverage, then runs `npm run setup:doctor -- --ci`.
- `.github/workflows/ci-typecheck-tests.yml`, `ci-build.yml`, `ci-supply-chain.yml` and `ci-security.yml` run the supported Node 24.x/26.x matrix; `release.yml` pins the 26.13.1 baseline.
- `npm run ci:verify` runs `npm run setup:doctor -- --offline`, so every push and pull request checks the env/document contract without a database.
- A hosted CI result is not attached to this workspace. Until one is recorded, `linux-ci` remains **configured**, not locally observed.

## 9. Evidence boundary

No macOS or clean Linux desktop setup has been executed locally. The Docker Compose file and daemon reachability passed the latest diagnostic, but full container startup via `npm run setup` is still unverified locally; the earlier daemon error above remains a documented recovery case. Real provider credentials, licensed supplier feeds, PSP accounts and regulatory approvals are not part of setup. A passing doctor report proves local Phase 1 setup checks are green; it is **Phase 1 gates only** and NO-GO for public launch.
