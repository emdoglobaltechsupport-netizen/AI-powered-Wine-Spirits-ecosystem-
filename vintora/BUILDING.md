# Building Vintora — Phase 1 foundation

This directory contains a Design-state documentation suite plus a runnable local Phase 1 Prototype build:

1. **`apps/prototype/`** — a zero-build, ES-module storefront covering every canonical module and the internal Admin simulation.
2. **`services/api/`** — Express + TypeScript API backed by PostgreSQL 16. It also serves the modular storefront from the same origin.
3. **`packages/shared/`** — canonical domain constants, age/FX/cart helpers and a `node:test` suite.
4. **`packages/db/`** — 19 SQL migrations and idempotent reference/demo seed data.
5. **`apps/web/` and `apps/mobile/`** — longer-term Next.js and Expo shells; they are scaffolding, not the tested Phase 1 surface.

All figures in the UI and docs are projections or illustrative demo data. No live orders, payments, campaigns, age-provider calls or AI model calls are made.

---

## 1. Prerequisites

### One-command setup (recommended)

| Tool | Requirement |
|---|---|
| Docker Engine/Desktop with Compose v2 | Optional (recommended); provides digest-pinned PostgreSQL 16 + pgvector and Redis 7 |
| Node.js / npm | Core requirement: Node 24.x or 26.x LTS and npm 11.x; Node 26.13.1 / npm 11.20.0 is the pinned local baseline; only the local `npm run setup` driver runs on the host |

No local PostgreSQL or Redis install is required for the Compose path. `npm run setup` generates all local values and runs the full verification suite. Run `npm run setup:doctor` first to check versions, the environment contract and Docker Compose availability.

### Manual fallback (no Docker)

Core tools are Node.js and npm; PostgreSQL and `psql` are optional dependencies of this variant only.

| Tool | Version |
|---|---|
| Node.js | 26.13.1 verified locally and pinned; supported range 24.x or 26.x LTS only |
| npm | 11.20.0 verified locally; supported range 11.x only |
| PostgreSQL | 16.16 verified locally; target 16.x |
| pnpm | 9.12.0 installed, but npm workspaces are the verified path |

PostgreSQL extensions: `citext`, `pgcrypto`, `pg_trgm` are required. `pgvector` is optional; `EMBEDDING_MODE=auto` records the selected mode in `schema_migration_metadata` and exposes it through startup output and `/health`. Without pgvector, the migration runner uses `jsonb` embedding columns: there is no vector index or cosine operator, and prototype search remains deterministic. See [`SETUP.md`](./SETUP.md#31-embedding-storage-modes-and-fallback) for limits, health fields and CI coverage.

All examples run from `vintora/` (the directory containing `package.json`, `.env.example` and `docker-compose.yml`) and use portable `npm` syntax. In Windows PowerShell, replace `npm` with `npm.cmd` (not `npm.ps1`); in `cmd.exe`, bash or zsh, use `npm` as shown. `npm run setup` and `npm run setup:verify` choose the correct shim internally.

See [`SETUP.md`](./SETUP.md) for the clean-machine guide, shell checks, Windows/macOS/Linux evidence matrix, setup variants, every environment variable, health checks, known failure messages and recovery actions. The Docker Compose file and daemon reachability passed the latest diagnostic, but full container startup via `npm run setup` is still unverified locally; the Windows manual PostgreSQL path is the verified local fallback. Do not describe macOS or clean Linux setup as validated until a run is recorded.

> The current workspace holds generated local values in `.env`. Never commit it. `.env.example` is deliberately credential-free.

---

## 2. Initial setup

### One command (Docker Compose)

From `vintora/`:

```bash
npm run setup
```

This generates/fills a credential-free `.env` with random local values, builds the API/prototype image, starts `db`, `redis`, `api` and `prototype`, waits for a healthy database, applies the 19 migrations and idempotent seed, then runs:

- `ci:verify` — API typecheck, shared tests, catalogue/accessories/Africa selftests, secret/credential scans, launch/licensing/catalogue-provenance/safeguards/claims checks, high-risk gate and forecast provenance metadata checks;
- `ci:build` — scoped builds and SBOM freshness;
- `test:smoke` — 34 API smoke checks against the running API/container, including catalogue provenance, privacy consent/DSAR, draft-only marketing controls and fail-closed checkout safeguards.

A green run proves **Phase 1 gates only**; see [`VALIDATION_STATUS.md`](./VALIDATION_STATUS.md).

Stop the stack with `npm run dev:down`. To re-run offline checks without containers, use `npm run setup:verify`.

### Manual fallback (existing local PostgreSQL)

```bash
# 1. Install workspace dependencies.
#    --legacy-peer-deps avoids the React/Expo peer conflict in the web/mobile shells.
npm install --legacy-peer-deps --no-audit --no-fund

# 2. Generate .env; empty secret placeholders are filled with random local values.
npm run setup:env

# 3. Align the generated role, database and extensions. Set VINTORA_PG_ADMIN_URL
#    in the shell first; hidden bash/zsh and PowerShell prompts are in SETUP.md §2.4.
npm run db:configure
npm run db:health

# 4. Apply migrations, verify the contract, then seed local-only identities.
npm run db:setup
npm run setup:doctor -- --ci
npm run db:seed:dev

# 5. Start the API and storefront; check health from a second terminal.
npm run dev:api
npm run api:health
```

`npm run db:configure` does not print the generated password; `npm run db:health` expects `Database health: PostgreSQL 16.x ready; required extensions present.` plus an `Embedding mode` line. `npm run api:health` expects `API health: ok (...)` plus the same mode. `dev:api` listens on <http://localhost:4000>. It serves the JSON API under `/v1` and the modular storefront at `/`. SCRAM password authentication is expected for a manual PostgreSQL install; do not leave `pg_hba.conf` in `trust` mode.

### Demo identities

**Local/test development only — non-production.** There are no fixed or ready-to-run passwords. `npm run setup` / `npm run setup:env` generate first-run values into gitignored `.env`, and the API/setup doctor reject legacy or reused seed credentials. Identities are created only by `npm run db:seed:dev`, which fails closed outside `local`/`test`.

| Role | Email variable | Password variable |
|---|---|---|
| Collector | `SEED_USER_EMAIL` (default `demo@vintora.local`) | `SEED_USER_PASSWORD` |
| Super admin | `SEED_ADMIN_EMAIL` (default `admin@vintora.local`) | `SEED_ADMIN_PASSWORD` |

Named approver users seeded from admin cases use `<code>@vintora.local` with the generated collector password. Sessions are HttpOnly cookies; tokens are stored as SHA-256 hashes in `app_sessions`.

---

## 3. Environment contract

The complete required/optional variable table is in [`SETUP.md`](./SETUP.md#4-environment-contract). It covers every key in `.env.example`, classifies generated/defaulted/optional values, gives safe examples and is checked by `npm run setup:doctor -- --offline`.

`.env` is gitignored. Never commit real keys. The API validates these values at boot and rejects `NODE_ENV=production`. Generated values are created only by `npm run setup` / `npm run setup:env`; `.env.example` contains empty secret placeholders. `config/setup-environment-matrix.json` is the machine-readable authority for the contract and the OS evidence matrix.

---

## 4. Run and verify

### API + storefront (DB-backed)

```bash
npm run dev:api
```

- Storefront: <http://localhost:4000/>
- Browser self-test: <http://localhost:4000/?selftest=1> → pass/skip/fail summary and generated total are printed in the panel and console (includes 19 Admin workspaces, TechOps agents, guards, filters, bulk dry run and kill switch)
- Admin simulation: <http://localhost:4000/?view=admin> or <http://localhost:4000/#admin>
- Health: <http://localhost:4000/health> (strict cross-platform check: `npm run api:health`)

The API hydrates the storefront catalogue from PostgreSQL. When opening the UI directly from the API origin, a best-effort `/v1/age/verify` call may log a 401 until a session exists; the local age gate remains authoritative in prototype mode.

### Standalone static prototype (no backend)

```bash
npm run prototype
```

- <http://localhost:8123/>
- Self-test: <http://localhost:8123/?selftest=1>
- Admin: <http://localhost:8123/?view=admin> or `#admin`

The static server has no `/v1` routes, so the UI falls back to its bundled catalogue and logs expected 404s for best-effort API calls. There are no missing ES-module imports.

### Automated checks

```bash
npm run setup:doctor        # setup readiness; --offline / --ci modes available
npm run db:configure        # local role/database alignment (needs VINTORA_PG_ADMIN_URL)
npm run db:health           # focused PostgreSQL health check
npm run api:health          # strict API /health check
npm run verify              # API typecheck + shared domain tests (88/88)
npm run test:smoke          # API smoke test, requires dev:api (34/34)
npm run identity:check      # deny-by-default role/tenant/jurisdiction policy
npm run agents:check        # 24 internal agents advisory-only, tool/approval/audit/kill gates
npm run privacy:check       # purpose-limited consent, data minimization, DSAR and DPIA gates
npm run marketing:check     # draft-only campaign human-release gates
npm run safeguards:check    # age/KYC/AML/sanctions/payment fail-closed controls
npm run boundaries:check    # runtime profiles, adapter opt-ins and audited actions
npm run credentials:check   # no reusable demo credentials or production seeding
npm run catalogue:provenance:check # demo rows labelled; verified source separate
npm run launch:check        # launch disabled; commercial licences unobtained
npm run claims:check        # documentation counts, lifecycle states and overclaim phrases
npm run catalogue:selftest  # Catalogue ingestion pipeline (generated count)
npm run accessories:selftest # Wine Accessories pipeline (generated count)
npm run africa:selftest      # Africa Marketplace registry (generated count)
npm run secrets:scan        # repository secret scan; .env excluded, template checked
npm run gates:check         # 17 high-risk features remain blocked and unsigned
npm run forecasts:check     # forecast provenance metadata only; no fact validation
npm run sbom:check           # CycloneDX SBOM freshness against package-lock.json
npm run ci:verify            # aggregate offline verification used by CI
npm run ci:build             # scoped builds + SBOM check
npm run test-counts:check    # generated suite counts match source and docs
```

<!-- test-counts:start -->
**Generated test counts** — source of truth: [`config/test-counts.json`](./config/test-counts.json). Refresh with `npm run test-counts:generate` / `npm run test-counts:docs`; CI runs `npm run test-counts:check`.

| Suite | Runtime | Generated total | Scope |
|---|---|---:|---|
| Browser self-test | Browser DOM (`?selftest=1`) | 65 checks | Rendered flows, ten modules and Admin/TechOps simulation |
| Verified catalogue pipeline | Node offline | 18 assertions | Fixture provenance, normalisation and coverage |
| Wine Accessories pipeline | Node offline | 36 assertions | Accessory taxonomy, validation and DDL contract |
| Africa Marketplace registry | Node offline | 54 assertions | Market registry, draft templates and storefront snapshot |

Browser section breakdown: Data and i18n 9 · Age gate and navigation 14 · Product, cart and checkout 6 · Preferences and FX 3 · Sommelier and Assist 6 · Studio, Trade, Seller and Flow 6 · Prototype safeguards 1 · Admin and TechOps 20.

Offline pipelines: 18 + 36 + 54 = 108 assertions.

Independent Phase 1 checks: 173 across 4 suites. The browser suite does not call the offline suites, and no assertion is counted twice; see `config/test-counts.json` for the overlap record.
<!-- test-counts:end -->

The smoke test creates a fresh registered collector per run, verifies age in the database, adds to cart, quotes FX, creates an idempotent simulated order, and exercises Admin guardrails. It is repeatable without resetting the database.

Verified catalogue ingestion is separate from the bundled demo catalogue:

```bash
npm run catalogue:ingest -- --licensed-feed ./feeds/supplier-a.json
npm run catalogue:ingest -- --openfoodfacts --off-query red-wine --off-query bourbon
npm run with-env -- npm run catalogue:import
```

It emits `packages/db/output/catalogue.import.json`, coverage and validation reports, and loads only source-backed rows above the confidence threshold. It never generates products to meet the 1,850-record target. `npm run with-env -- ...` loads the gitignored `.env` into the child process, avoiding shell-specific export syntax. See `25-catalogue-data-pipeline.md`.

Wine Accessories is a separate catalogue domain under Vintora Market:

```bash
npm run accessories:ingest -- --feed ./feeds/wine-accessories.json --strict --require-categories
npm run accessories:import -- --input packages/db/output/wine-accessories.import.json
```

It enforces licensed/authorised image assets, approved moderation, regional pricing, search indexes, deterministic SEO/bundle/cross-sell enrichment and an append-only audit trigger. See `26-wine-accessories-module.md`.

Africa Marketplace is a 14-market design-target registry inside Vintora Market; no country is active:

```bash
npm run africa:build

npm run with-env -- npm run africa:import
```

It generates a country/currency/language registry, 38 candidate brand records and draft listing templates covering every requested field. It also writes `apps/prototype/src/africa-snapshot.js`, which powers a read-only **Africa Marketplace** panel inside the Vintora Market Home view without adding a top-level module. All product facts, prices, barcodes, awards and image URLs remain empty until verified sources are attached; no draft is auto-promoted to a live product. See `27-africa-marketplace.md`.

### Governance and CI

The repository-level governance layer is documented in [`DISCLAIMER.md`](./DISCLAIMER.md), [`FEATURE_STATUS.md`](./FEATURE_STATUS.md), [`API_POLICY.md`](./API_POLICY.md), [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md), [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md), [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md), [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md), [`ROADMAP.md`](./ROADMAP.md), [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md), [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md) and [`SECURITY.md`](./SECURITY.md). The five architecture decision records are indexed in [`adr/README.md`](./adr/README.md). None of these documents changes the NO-GO launch posture.

CI workflows live in `.github/workflows/`:

| Workflow | Checks |
|---|---|
| `ci-typecheck-tests.yml` | `ci:verify` — offline setup doctor, API/shared typechecks, all offline selftests, secret/licence/pin scans, gate check and forecast check |
| `ci-migrations.yml` | PostgreSQL 16 service; generated throwaway test secrets; extensions; `db:setup` applied twice for idempotency; `setup:doctor --ci` environment diagnostic |
| `ci-security.yml` | Deterministic secret scan, optional gitleaks, full audit report, scoped release gate, SBOM freshness, licence/pin checks and CodeQL |
| `ci-supply-chain.yml` | Trivy container and IaC scans with SARIF retention; licence, artifact-pin and SBOM policy checks |
| `ci-build.yml` | Scoped API/shared builds, storefront syntax checks and SBOM check |
| `release.yml` | Build once from digest-pinned base, block on High/Critical image findings, cosign sign/verify, retain evidence |

The SBOM is generated from `package-lock.json` with `npm run sbom:generate` and verified with `npm run sbom:check`. Release-audit exceptions are time-boxed in `security/audit-exceptions.json`; critical advisories are never exempt. Licence rules live in `config/license-policy.json` (`npm run licenses:check`), while base-image digests and release policy live in `config/artifact-policy.json` (`npm run artifacts:check`). See [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md) for patch timelines, exception rules and signing flow.

---

## 5. API surface

All `/v1` responses include `X-Vintora-Api-Version: v1`, including validation errors and unmatched routes. Clients may pin the version with `Accept-Version: v1` (or `1`); unsupported values return `400 invalid_request`. all prototype HTTP requests are subject to a CodeQL-recognised `express-rate-limit` fixed-window limiter (default 1,000 requests per 15 minutes per client IP, configurable with `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`) with `RateLimit-*` headers and `429 rate_limited` / `Retry-After`. Mutating requests emit structured stdout audit records; checkout accepts an idempotency UUID in `idempotencyKey` or the `Idempotency-Key` header. See [`API_POLICY.md`](./API_POLICY.md) for compatibility and production requirements.

### System and reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness, build info and DB health |
| GET | `/v1/canon` | Locked canon identity, modules, scale and financial targets |
| GET | `/v1/reference` | Currencies, club tiers and simulated-provider labels |
| GET | `/v1/fx/rates` | Eight locked-rate currencies; 15-minute quote lock |

### Auth and age

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/auth/register` | none | Create a collector and start a session |
| POST | `/v1/auth/login` | none | Start a session with seeded/demo credentials |
| POST | `/v1/auth/logout` | session | Revoke the current session |
| GET | `/v1/auth/me` | session | Current identity, roles and adapter config |
| POST | `/v1/age/verify` | session | Validate DOB + country and persist the result |
| GET | `/v1/age/status` | session | Latest stored age assertion |

### Core commerce

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/v1/products?type=&q=&limit=` | none | DB-backed catalogue search |
| GET | `/v1/products/:id` | none | Product detail |
| GET | `/v1/cart` | session | Persisted cart with subtotal |
| POST | `/v1/cart/items` | session | Add `{ productId, quantity }` |
| PATCH | `/v1/cart/items/:sku` | session | Update quantity |
| DELETE | `/v1/cart/items/:sku` | session | Remove line |
| DELETE | `/v1/cart` | session | Clear cart |
| POST | `/v1/checkout/quote` | session + verified age | 15-minute FX-locked quote |
| POST | `/v1/checkout/orders` | session + verified age | Idempotent simulated order; clears cart |
| GET | `/v1/orders/:orderNumber` | session | Order detail with line items |

### Admin (role-gated)

Reads require `super_admin`, `finance_ops`, `seller_ops`, `ai_ops`, `growth_ops` or `auditor`. Writes require `super_admin`.

- `GET /v1/admin/overview`, `/users`, `/sellers`, `/orders`, `/logistics`, `/payments`, `/campaigns`, `/ai`, `/cases`, `/access`, `/evidence/export`, `/coverage`
- `POST /v1/admin/cases/:code/assign`, `/cases/:code/resolve`, `/cases/:code/escalate`
- `POST /v1/admin/approvals/:id/decide`
- `POST /v1/admin/ai/kill-switch`, `/ai/:key/promote`
- `POST /v1/admin/elevation`, `/session/end`

Guardrails are enforced server-side: four-eyes approvals need a distinct approver, tier-3/tier-4 actions require an elevated session plus a reason, the AI kill switch toggles all models, and JIT/break-glass elevations are time-boxed and audited. Break-glass validates the T4 reason/approver pair without prior JIT elevation because it creates the elevation session.

`GET /v1/admin/coverage` returns `computedAt`, `source`, `asOf`, a disclaimer and one status/notes/counts block per ADM-01…ADM-19 workspace. Counts are separated into RLS-tenant, explicit-tenant, single-tenant demo and shared-reference scopes. It returns no rows, no PII and no live KPI claims; user-scoped tables are excluded because the Admin session sets only `app.tenant_id`.

### Simulated module adapters

These return `simulated: true` and never contact live providers:

- `POST /v1/sommelier/ask`
- `GET /v1/trade/suppliers`, `/rfqs`, `/rfqs/:id/quotes`, `/purchase-orders`, `/credit`
- `POST /v1/trade/rfqs/:id/award` (requires an authenticated verified business session with licence, contract, jurisdiction and available credit; still simulated)

All trade routes are deny-by-default: they resolve business verification and credit from the session and database, never from request headers. See [`IDENTITY_ACCESS_BOUNDARIES.md`](./IDENTITY_ACCESS_BOUNDARIES.md).

Example:

```bash
curl -sS -X POST http://localhost:4000/v1/sommelier/ask \
  -H 'Content-Type: application/json' \
  -d '{"query":"what works with spicy Thai food"}'
```

In Windows PowerShell, call `curl.exe` explicitly to avoid the `Invoke-WebRequest` alias, or use the equivalent `Invoke-RestMethod` command.

---

## 6. What is DB-backed vs simulated

| Area | Status |
|---|---|
| Catalogue, product detail, carts, sessions, age assertions, orders, payments ledger rows, Admin cases/approvals/audit | Real PostgreSQL reads/writes with Zod validation and central error handling |
| Checkout payment capture | Simulated adapter; writes a ledger-shaped `payments` row but contacts no processor |
| Sommelier, Assist, Studio, Trade award, campaigns, model controls | Deterministic/local adapter responses behind explicit interfaces |
| Age/KYC providers | Local labels stored in DB; no third-party verification |
| Club/Vault/Rewards/Flow/Seller screens | Interactive prototype views; not yet full APIs |
| Admin Panel, Global Payments, AI Marketing Automation, Ultimate AI TechOps | Internal operations/platform layers; canonical ten market-facing modules unchanged |
| Admin 19-workspace console | Deterministic local simulation; `GET /v1/admin/coverage` reports count-only coverage of seeded DB tables and never exposes business rows or PII |
| Admin DB coverage boundary | RLS-tenant and explicitly tenant-filtered tables are counted separately from single-tenant demo and shared reference tables; user-scoped tables are excluded from Admin reads |

---

## 7. Repository layout

```text
vintora/
├── README.md, BUILDING.md, _canon.md
├── 01..27-*.md                 Documentation suite (21–27 are internal layers/domains/expansions)
├── apps/
│   ├── prototype/
│   │   ├── index.html, styles.css, data.js, selftest.js, serve.ps1
│   │   └── src/
│   │       ├── africa-snapshot.js Generated read-only Africa Marketplace registry view
│   │       ├── app.js          Entry point, routing, events, API hydration
│   │       ├── core.js         State, i18n, formatting, shared components
│   │       ├── api.js          Same-origin API client with offline fallback
│   │       ├── admin/          admin state/registry, components, 19 section
│   │       │                   renderers and guarded simulation actions
│   │       └── views/          catalogue, checkout, sommelier, assistant,
│   │                           membership, platform, trade, admin shell
│   ├── web/                    Next.js 15 shell (longer-term surface)
│   └── mobile/                 Expo / React Native shell (Phase 3 target)
├── packages/
│   ├── shared/                 Canon + age/FX/cart helpers + node:test suite
│   └── db/
│       ├── migrations/         0001..0013 SQL migrations
│       ├── seed/               Reference, product content, app and admin seeds
│       ├── config/             Beverage, accessories and Africa Marketplace registries
│       ├── examples/           Feed contracts and synthetic OFF/accessories fixtures
│       ├── schemas/            Canonical beverage, accessories and Africa registry schemas
│       ├── sql/                RLS staging: catalogue_import.sql, wine_accessories.sql, africa_marketplace.sql
│       └── scripts/            Ingest, import, selftest and adapters for all domains
├── services/api/
│   ├── src/modules/            auth, age, catalog, cart, checkout, orders,
│   │                           admin (routes, repo, count-only coverage),
│   │                           system, simulations
│   ├── src/db/                 pool, tenant context, migrations, seeds, CLI
│   ├── src/middleware/         auth, validation, errors, request IDs
│   └── scripts/smoke.mjs       23-check API smoke test
├── docker-compose.yml          PostgreSQL + Redis (optional)
├── package.json                npm workspace root
└── .env.example                Placeholder environment contract
```

---

## 8. Mapping to the blueprint

| Blueprint promise | Implemented here |
|---|---|
| `03-technical-architecture.md` — API split, shared types, guardrails | Express API, `@vintora/shared`, Zod validation, central errors, tenant context |
| `04-database-design.md` — identity, catalogue, commerce, B2B, loyalty, AI tables | 13 migrations seeded idempotently; pgvector fallback on stock PostgreSQL |
| `05-ui-ux-wireframes.md` — tokens and screens | All screens in the modular storefront; generated-count self-test |
| `06-ai-features.md` — Sommelier, citations, safety note | Deterministic adapter with the same response contract |
| `11-b2b-wholesale-module.md` — RFQ/quote/award workflows | Trade workbench plus simulated Trade API routes |
| `17/18/20` — Club, Rewards, Vault | Interactive prototype views; SQL schema present, APIs pending |
| `21-admin-panel-module.md` — RBAC, approvals, AI controls | 19-workspace interactive Admin simulation, role-gated Admin API and count-only coverage endpoint |
| `22-global-payments-module.md` — FX lock, ledger discipline | 15-minute quotes, simulated capture, ledger-shaped rows, no raw PAN/CVV |
| `23-ai-marketing-automation-module.md` — human release, ≤8% cap | Studio preview with compliance checklist; no publishing or ad spend |
| `24-ai-techops-team-module.md` — 24-agent operations team | ADM-19 simulation with guarded workflows, alert/ticket/report panels and production design contract |
| `25-catalogue-data-pipeline.md` — verified catalogue ingestion | Source adapters, 25-field contract, provenance/confidence, honest coverage reports and Supabase/PostgreSQL import |
| `26-wine-accessories-module.md` — accessories catalogue domain | Nine categories, licensed/authorised assets, image moderation, regional prices, search indexing, deterministic AI enrichment and append-only audit |
| `27-africa-marketplace.md` — Africa market expansion | 14 target-market records, 5 registry languages, candidate brand onboarding, draft catalog templates, pricing, distributor, inventory, logistics, search and compliance architecture; no country activation |

---

## 9. Deliberately not built yet

- Real LLM/RAG, vector index and knowledge graph
- Real payment processors, KYC vendors or age-assurance providers
- Production auth provider, multi-tenant routing and RLS from session context
- Kafka, Redis caching, OpenSearch, GraphQL federation, gRPC mesh
- Carrier telemetry, customs documents, Vault custody/settlement
- CI/CD, load tests, production observability and certified compliance controls
- A bundled 1,850-product verified catalogue; the pipeline is present, but the repository contains only 12 demo SKU rows, 0 licensed feeds and 0 verified rows; 1,850 is an acquisition target and 10M+ SKUs is an unmeasured long-term target
- Bundled real Wine Accessories assets or prices; the pipeline is present, but real rows require licensed/authorised sources

See `08-launch-roadmap.md` for phase gates and `01-business-plan.md` §10 for the regulatory risk register.

---

## 10. Recommended next build steps

1. Move the remaining module views behind typed API contracts and DB reads.
2. Replace deterministic Sommelier/Assist adapters with the evaluated RAG pipeline.
3. Add real provider adapters behind the existing age, KYC and payment interfaces.
4. Turn the modular storefront into React components using the shared design tokens.
5. Add CI for `verify`, `test:smoke`, the browser self-test and migration idempotency.
