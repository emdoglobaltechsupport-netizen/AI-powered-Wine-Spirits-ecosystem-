# Vintora Validation Status — What Is Proven and What Is Not

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.**
> A green verification run proves **Phase 1 gates only**. It is not launch approval, legal clearance, commercial readiness or evidence of live scale.

This document separates planning claims from validation claims. Machine-checked counts are derived from the same files used by CI; prose must not overstate them.

## 1. Claims proven by local machine checks

| Claim | Evidence | Boundary |
|---|---|---|
| Canon defines exactly ten market-facing modules and the internal layers | `npm run verify`; `packages/shared/src/index.ts` and canon tests | Product definition only; no module is live |
| Four maturity states and module/environment mappings are explicit | `npm run claims:check`; [`config/implementation-status.json`](./config/implementation-status.json), README, `FEATURE_STATUS.md`, `ROADMAP.md` | Design/Prototype only; no Pilot or Production component |

| Admin has 19 workspaces and `ADM-19` has 24 advisory-only agents | `npm run verify`, `npm run identity:check`, `npm run agents:check` | Internal simulation, no autonomous tool execution |
| Beverage minimums and projection-only figures are registered | `npm run verify`, `npm run forecasts:check` | Minimums are design gates; 16 market records are uncited Low-confidence estimates |
| Fourteen high-risk features remain blocked and unsigned | `npm run gates:check`, `npm run launch:check` | Proves blocked state, not permission to activate |
| Privacy, marketing and commerce controls are deny-by-default | `npm run privacy:check`, `npm run marketing:check`, `npm run safeguards:check` | Prototype evaluators and append-only evidence only |
| Public catalogue is labelled demo data | `npm run catalogue:provenance:check`, `npm run test:smoke` | 12 bundled rows from `001_seed.sql`; no licensed supplier feed |
| Repository contains no reusable privileged demo credentials | `npm run secrets:scan`, `npm run credentials:check`, `config/credential-policy.json`, API startup self-test | First-run generated values live only in gitignored `.env`; dev identities require `db:seed:dev` in `local`/`test`; rotation runbook in `SETUP.md` |
| Runtime profiles, adapter defaults and privileged-action audit registry are fail-closed | `npm run boundaries:check`, `npm run verify`, API startup self-test | Proves prototype config boundaries only; no real provider or retained audit sink |
| Age assurance is blocked pending legal review and provider evidence | `npm run boundaries:check`; [`AGE_ASSURANCE_BOUNDARY.md`](./AGE_ASSURANCE_BOUNDARY.md) | Local DOB assertion and simulated controls are not a licensed age check |
| Setup contract, versions, cross-platform shell guidance and env documentation are complete | `npm run setup:doctor -- --offline`; `config/setup-environment-matrix.json`; [`SETUP.md`](./SETUP.md) | Checks template/docs parity, Windows/macOS/Linux guidance and health-check coverage; no DB, Docker or network required |
| Node/npm support is explicit and enforced | `.nvmrc`, `.node-version`, `.npmrc` (`engine-strict=true`), `package.json` engines and `npm run setup:doctor -- --offline` | Supported range Node 24.x/26.x LTS + npm 11.x; baseline 26.13.1/npm 11.20.0 tested locally, Node 24 configured in CI but no hosted result attached |
| Migration embedding mode is recorded and observable | `npm run db:setup`, `npm run db:migrations:test`, `GET /health` `embedding` fields, `db:health`, `api:health`, `config/setup-environment-matrix.json` | Local jsonb fallback contract exercised; pgvector mode configured in CI but no hosted result attached. jsonb has no vector index or cosine operators and no embeddings are produced |
| Windows manual PostgreSQL setup works from a generated `.env` | Local `db:setup`, `ci:verify`, `ci:build`, `test:smoke`, browser `?selftest=1` on Node 26.13.1/npm 11.20.0/PostgreSQL 16.16 | Only the Windows manual path is verified locally |
| Offline pipelines and API smoke checks pass | `npm run ci:verify`, `npm run ci:build`, `npm run test:smoke`, browser `?selftest=1` | Deterministic local checks; no external provider or live traffic |

## 2. Counts

- **Shared domain tests:** 88/88 (including the five-control commerce evaluator, age-evidence expiry cases, runtime/adapter boundary cases, four-tier AI safety, recommendation-only pricing, privacy consent, data governance, external marketing approval and responsible-drinking limits).
- **API smoke checks:** 34/34 (including catalogue provenance, commerce safeguards and denied jurisdiction).
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
- **High-risk records:** 17 blocked, all with null Legal and Compliance sign-offs.
- **Market forecast records:** 16 uncited Low-confidence projections; `npm run forecasts:check` checks provenance metadata only.
- **Migrations:** 19; demo catalogue rows: 12; Admin workspaces: 19; ADM-19 agents: 24.

Shared, API and generated suite counts are derived from their source files. If a checker or suite changes, run `npm run test-counts:generate`, `npm run test-counts:docs` and `npm run claims:check`; CI rejects drift between sources, generated registers and documentation.

## 3. Claims explicitly not made

- No licensed supplier, distributor, PSP, custodian, age provider, KYC provider or official screening feed is attached.
- No real product, barcode, award, price, image URL or in-stock guarantee is asserted.
- No legal or compliance sign-off has been granted; launch manifests remain null/false.
- No component is in the Pilot or Production state; every component is not production-ready in this phase.
- No production scale target has been measured: 100M users, 10M SKU target, 200 countries, 1.2M orders/day peak, 50k requests/second, p95 < 200 ms and 99.99% availability are design targets only.
- No revenue or market-size figure is reported actual performance; all are management projections.
- No external accessibility audit, DPIA, penetration test, load test, disaster-recovery drill, kill-switch timing drill or independent security audit is attached.
- Hosted Phase 1 CI workflows are green for commit `005f823` (see [`EVIDENCE_INDEX.md`](./EVIDENCE_INDEX.md) / [`RELEASE_GATES.md`](./RELEASE_GATES.md)); this is Phase 1 gate-parity evidence only, not launch approval, signed release evidence, or production security/compliance evidence.
- Docker Compose config and daemon reachability passed the latest `setup:doctor` run; full container startup via `npm run setup` is still not exercised locally, and an earlier HTTP 500 daemon error remains a documented recovery case.

## 4. Release verdict

**NO-GO.** The repository is a local development, demonstration and architecture-review prototype. It must not accept live orders, live payments, real personal data, regulated alcohol transactions, real advertising spend or customer-facing autonomous AI actions until the gates in [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md), [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) and [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) are independently evidenced.
