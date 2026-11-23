# VINTORA

### *The World's Cellar, Intelligent.*

A local Phase 1 prototype and Design-state documentation suite for a planned global AI-powered wine & spirits ecosystem — spanning consumer commerce, wholesale, artificial intelligence, seller tooling, logistics, subscriptions, investment, loyalty, web and mobile. It is **not investor-ready** and NO-GO for public launch.

This repository contains a **runnable Phase 1 prototype plus Design-state planning and governance documents**. Every document shares one canonical product definition (`_canon.md`), so the business plan, architecture, wireframes, and pitch deck use the same brand, numbers, modules, and timeline. The Africa Marketplace expansion adds a prototype 14-market, five-language registry inside Vintora Market; no country is activated. See [`BUILDING.md`](./BUILDING.md) to run the prototype and [`VALIDATION_STATUS.md`](./VALIDATION_STATUS.md) for what is actually proven. A green run proves **Phase 1 gates only**.

> **MATURITY / COMPLIANCE: NO-GO FOR PUBLIC LAUNCH.** This is a Phase 1 prototype with Design-state documentation, not a live alcohol marketplace, payment processor, custodian, KYC provider or production AI system. Read [`DISCLAIMER.md`](./DISCLAIMER.md) before using, citing or deploying any part of it.

> **Prototype mode — no real orders are placed.** Payments, age/KYC, AML/sanctions screening, AI, logistics and custody are simulated or deterministic behind adapter interfaces. All scale, revenue and market figures are projections or demo values, never reported results.

---

## Implementation status (read this before any capability claim)

### Maturity states

| State | Definition | Phase 1 status |
|---|---|---|
| **Design** | Specification, register, wireframe or workflow with no runnable artifact or live effect. | Documentation, CI/release workflow definitions, target architecture and all planned capabilities. |
| **Prototype** | Runnable local demo using demo data or deterministic/simulated adapters; no external side effects. | Current repository state. |
| **Pilot** | Restricted live operation with licensed providers, named operators, controlled real users and recorded evidence. | Not present. |
| **Production** | Public live operation after security, reliability and compliance evidence plus explicit launch approval. | Not present and blocked. |

No component in this repository is in the Pilot or Production state. All current components are **not production-ready**; that term is reserved for components that have passed security, reliability and compliance evidence and have an approved launch record. A green check proves **Phase 1 gates only**, never a state promotion.

The machine-readable register is [`config/implementation-status.json`](./config/implementation-status.json); `npm run claims:check` verifies that these labels stay aligned across README, [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) and [`ROADMAP.md`](./ROADMAP.md).

### Module status

| # | Module | Maturity state | What runs in the prototype | Not implemented / next gate |
|---:|---|---|---|---|
| 1 | **Vintora Market** | Prototype | Age-gated demo catalogue, search, product detail, cart and checkout with five simulated safeguards. | No real catalogue rights, jurisdictional age assurance, PSP, fulfilment or live inventory. |
| 2 | **Vintora Trade** | Prototype | RFQ and wholesale screens with deterministic responses. | No contracts, credit engine, distributor KYB or live ordering. |
| 3 | **Vintora Sommelier** | Prototype | Deterministic pairing and safety note in the local UI and API. | No model calls, evaluation evidence, voice or multilingual production service. |
| 4 | **Vintora Assist** | Prototype | Confirmation-based concierge demo and cross-module routing. | No external actions, real personalization or tool execution. |
| 5 | **Vintora Studio** | Prototype | Rule-derived marketing draft UI with a human-release gate. | No generative model, live platform, ad spend or automatic publishing. |
| 6 | **Vintora Seller** | Prototype | Merchant screens with demo listings and inventory. | No real seller onboarding, payouts, tax or order fulfilment. |
| 7 | **Vintora Flow** | Prototype | Shipment-tracking demo with deterministic events. | No carrier integrations, customs/tax engine, cold-chain telemetry or delivery age check. |
| 8 | **Vintora Club** | Prototype | Tier and box screens. | No billing, dunning, allocation or fulfilment. |
| 9 | **Vintora Vault** | Prototype | Portfolio and fee-explanation demo. | Custody, fractional title, secondary settlement and investor eligibility are blocked. |
| 10 | **Vintora Rewards** | Prototype | Unified points-balance demo. | No ledger of record, partner integration or redemption. |

Africa Marketplace is a catalogue domain inside Vintora Market: its 14-market registry and five-language candidate list are **Prototype** data, not country activation.

### Internal layers and environment status

| Area | Maturity state | What exists | Not implemented / gate |
|---|---|---|---|
| **Admin Panel** | Prototype | 19-workspace console, count-only coverage, guarded mutations and append-only audit. | No production IdP/MFA, retained audit store or live privileged operations. |
| **Global Payments** | Prototype | Simulated payment adapter, 15-minute FX lock and idempotent checkout. | No PSP, ledger of record, reconciliation or disputes. |
| **AI Marketing Automation** | Prototype | Draft-only evaluator, approval gate and audit events. | No ad platform, spend, email send or automatic publishing. |
| **Ultimate AI TechOps** | Prototype | 24-agent advisory evaluator, allowlist, approval, isolation and safe-stop controls. | No autonomous execution or timed kill-switch drill. |
| **Local runtime** | Prototype | Docker Compose or manual PostgreSQL fallback serving the API and storefront. | Localhost and demo identities only. |
| **Test profile** | Prototype | Boundary profile, shared domain tests, offline selftests and API smoke checks. | No hosted test environment. |
| **Staging profile** | Design | Profile contract and startup self-test only. | No hosted staging environment, credentials or licensed providers. |
| **Production profile** | Design | Fail-closed guard and boundary configuration only. | Startup is rejected; no Production-state environment exists. |
| **Hosted CI** | Design | Workflow definitions for typechecks, tests, migrations, scanning and release. | No hosted CI result is attached to this local snapshot. |
| **Web shell** | Design | Next.js landing shell that links to the local prototype. | Not a functional web application. |
| **Mobile shell** | Design | Expo placeholder showing canon facts and the Phase 3 target. | Not a functional mobile application. |

## What is and is not implemented

**Implemented in the Prototype state:** the local Express/PostgreSQL API and modular storefront; catalogue browse, product detail, cart and simulated checkout; the DB-backed local age assertion and five-control safeguard evaluator; the 19-workspace Admin simulation; privacy, marketing and agent control evaluators; offline catalogue/accessories/Africa pipelines; local migrations, demo seed data, verification commands and SBOM generation.

**Not implemented (Design, blocked or absent):** licensed age/KYC/AML/sanctions screening; a real PSP, ledger, reconciliation or dispute workflow; custody, fractional title and investment settlement; real model calls, autonomous agents or live AI actions; live advertising, email send or publishing; production IdP/MFA, distributed rate limiting or a retained/WORM audit store; DSAR/retention jobs and delivery age checks; hosted staging/production environments; functional Next.js/Expo applications; 24-language/135-currency/RTL UI; measured scale or SLO evidence; external audits, certifications and penetration tests.

## Claim review requirement

**Investor, roadmap and readiness claims.** Updates to investor or roadmap claims — [`INVESTOR_DOCUMENTATION.md`](./INVESTOR_DOCUMENTATION.md), `ROADMAP.md`, deliverables 01, 02, 07, 09 and 10, or any external investor artifact — require the four-eyes review in [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) §§4 and 8 before publication: Canon Steward plus a distinct approver, with Compliance/Legal review for regulated claims and CFO/Finance review for financial figures. Financial, safety and regulatory claim changes also follow [`CLAIMS_CHANGE_MANAGEMENT.md`](./CLAIMS_CHANGE_MANAGEMENT.md); record the RFC/CCR and keep `npm run claims:check` and `npm run claims-change:check` green. A documentation-only change cannot promote a module or environment from Design or Prototype to Pilot or Production.

---

## Phase 1 quick start (local only)

### Shell and directory conventions

Run every command from `vintora/`, the directory containing `package.json`, `.env.example` and `docker-compose.yml`. `.env.example` is committed; `.env` is generated on first use and is gitignored. No pre-existing `.env` is required.

Examples below use portable `npm` syntax:

| Shell | Command spelling |
|---|---|
| Windows PowerShell | `npm.cmd ...` (not `npm.ps1`) |
| Windows `cmd.exe` | `npm ...` |
| macOS / Linux `bash` or `zsh` | `npm ...` |

`npm run setup` and `npm run setup:verify` select the correct shim internally. See [`SETUP.md`](./SETUP.md#2-core-prerequisites-optional-dependencies-and-setup-variants) for directory checks, every environment variable and recovery steps.

### Core prerequisites (all paths)

- Node 24.x or 26.x LTS with npm 11.x; Node 26.13.1 / npm 11.20.0 is the locally verified baseline and is pinned by `.nvmrc`, `.node-version` and `.npmrc` (`engine-strict=true`).
- This repository snapshot; `npm install --legacy-peer-deps --no-audit --no-fund` from `vintora/`.
- No pre-existing `.env`: `setup`, `setup:env` and `setup:verify` create it with local-only random values and never print them.

### Variant A — Docker Compose (recommended)

Optional dependency: Docker Engine/Desktop with Compose v2. It supplies PostgreSQL 16 + `pgvector` and Redis; no host database install is needed.

```bash
npm install --legacy-peer-deps --no-audit --no-fund
npm run setup:doctor -- --offline
npm run setup
npm run api:health
```

`setup` generates `.env`, starts `db`, `redis`, `api` and `prototype`, waits for health, applies idempotent migrations, then runs typechecks, all offline selftests, secret/credential scanning, launch/licensing/catalogue-provenance/safeguards/runtime-boundary/claims checks, forecast provenance checks, SBOM freshness and the API smoke test. `npm run api:health` prints `API health: ok (runtimeProfile=local, runtimeBoundaryOk=true).` and the recorded `Embedding mode` (`pgvector` or the `jsonb` fallback) when the stack is live. Use `npm run dev:down` to stop it. A green run proves **Phase 1 gates only**.

Docker Compose config and daemon reachability passed the latest diagnostic, but full container startup via `npm run setup` is still unverified locally; the manual PostgreSQL path below is the verified local fallback. Common daemon and shell errors are in [`SETUP.md`](./SETUP.md#7-known-failures-and-recovery).

### Variant B — Manual host PostgreSQL (verified local fallback)

Optional dependency: PostgreSQL 16 with `citext`, `pgcrypto` and `pg_trgm` (`pgvector` is optional; `EMBEDDING_MODE=auto` records and reports whether migrations used `pgvector` or the `jsonb` fallback). Generate `.env` first, then align the role and extensions with a transient superuser DSN:

```bash
npm install --legacy-peer-deps --no-audit --no-fund
npm run setup:env
npm run db:configure       # set VINTORA_PG_ADMIN_URL in the shell first; see SETUP.md §2.4
npm run db:health
npm run db:setup           # migrations + source-labelled demo catalogue data
npm run setup:doctor -- --ci
npm run db:seed:dev        # local/test-only identities; generated secrets from .env
npm run dev:api            # http://localhost:4000 (API + modular storefront)
npm run api:health         # run in a second terminal
```

Expected step output: `Created .env`, `Local DB configured: role=vintora database=vintora extensions=citext,pgcrypto,pg_trgm ready`, `Database health: PostgreSQL 16.x ready; required extensions present.`, `[db] setup complete`, `development-only identity seed complete` and `API health: ok (...)`. The role/extension SQL and hidden DSN prompts for PowerShell, bash and zsh are in [`SETUP.md`](./SETUP.md#24-variant-b--manual-host-postgresql).

The API process also serves the modular storefront at <http://localhost:4000/>. For a zero-backend static run, use `npm run prototype` and open <http://localhost:8123/>; the UI falls back to its bundled catalogue when no API is present.

Demo identities are **local/test development only and non-production**. `npm run setup` generates first-run passwords into gitignored `.env`; no fixed password is published or ready to run. Emails default to `demo@vintora.local` and `admin@vintora.local`, and the matching generated values are `SEED_USER_PASSWORD` and `SEED_ADMIN_PASSWORD`. Never commit `.env`, reuse these credentials on a shared host, or share the generated values. Rotation and session revocation are documented in [`SETUP.md`](./SETUP.md#5-credential-rotation-and-access-revocation).

Verification:

```bash
npm run setup:verify         # regenerate/fill .env, then all offline checks
npm run setup:doctor         # setup readiness diagnostic; --offline / --ci modes available
npm run db:health            # focused PostgreSQL health check
npm run api:health           # strict API /health check
npm run verify               # API typecheck + shared domain tests
npm run test:smoke           # requires a running API; 34 API checks
npm run catalogue:selftest   # source-labelled demo catalogue pipeline (generated count)
npm run accessories:selftest # Wine Accessories pipeline (generated count)
npm run africa:selftest      # Africa Marketplace registry (generated count)
npm run secrets:scan         # deterministic repository secret scan
npm run licenses:check       # npm SPDX dependency licence policy only, not commercial licences
npm run artifacts:check      # digest-pinned images and SHA-pinned CI actions
npm run identity:check       # B2C/B2B/investment role, tenant and deny-by-default policy
npm run agents:check         # 24 internal agents advisory-only, tool/approval/audit/kill gates
npm run privacy:check        # purpose-limited consent, data minimization, DSAR controls and DPIA gate metadata; no completed DPIA
npm run marketing:check      # human approval, audience deny lists, spend cap and release blockers
npm run safeguards:check     # age/KYC/AML/sanctions/payment fail-closed controls
npm run boundaries:check     # runtime profiles, adapter opt-ins and audited actions
npm run credentials:check    # no seeded production credentials or reusable demo secrets
npm run catalogue:provenance:check # demo rows are labelled; verified source remains separate
npm run launch:check         # public launch disabled and commercial licences unobtained
npm run claims:check         # docs counts, lifecycle states and unqualified overclaims
npm run gates:check          # all high-risk features remain blocked/unsigned
npm run forecasts:check      # provenance metadata only; no forecast is factually validated
npm run sbom:check           # CycloneDX SBOM matches package-lock.json
npm run ci:verify            # aggregate offline verification used by CI
npm run ci:build             # scoped builds + SBOM freshness check
npm run test-counts:check    # generated suite counts match source and docs
npm run adr:check            # ADR index, registry, template and required sections
npm run canonical:check      # modules, regions, currencies, languages and counts
npm run evidence:check       # evidence register links and explicit null gaps
npm run fixtures:check       # demo/mock/synthetic/live fixture labels
npm run claims-change:check  # financial/safety/regulatory claim change control
npm run status:check         # status dashboard and release gates
npm run retention:check      # retention/deletion architecture parity
npm run network:check        # loopback bindings and internal data network
npm run markdown:check       # governed Markdown markers and relative links
npm run schemas:check        # config JSON parse/shape/cross-reference checks
npm run health:check         # live database + API health (requires running stack)
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

Open <http://localhost:4000/?selftest=1> for the browser self-test, or <http://localhost:4000/?view=admin> / <http://localhost:4000/#admin> for the interactive 19-workspace Admin simulation. All payments, AI, age/KYC and provider calls are simulated or deterministic behind adapter interfaces; no real transactions or campaigns are executed. The 24 ADM-19 agents are internal and advisory-only: [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md) documents the enforced allowlist, approval, isolation, injection defence, local append-only audit events and independent safe-stop, with remaining evidence gaps explicit.

### AI data and marketing controls

AI personalization is **off by default** and uses a machine-checked purpose map. [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md) explains the data inventory, data minimization rules, granular opt-in/withdrawal, separation of recommendation/marketing/experimentation data, simulated export and human-reviewed deletion requests, retention schedules and the incomplete DPIA. Sensitive, health-adjacent, precise-location, biometric, consumption and identity-document data are never used for profiling.

AI-generated marketing is **draft-only**: [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md) documents mandatory human approval with a distinct approver, audience and geography deny lists, alcohol-advertising claim validation, blocked budget increases, prototype-only provenance/audit records and simulated pause/rollback with anomaly alerts. No retained/WORM production sink, live platform, ad spend, email send or automatic publishing exists.

Checkout screening is **fail-closed and simulated**: [`COMMERCE_SAFEGUARDS.md`](./COMMERCE_SAFEGUARDS.md) records the enforced age/KYC/AML/sanctions/payment boundary, age evidence expiry and append-only decisions. [`RUNTIME_BOUNDARIES.md`](./RUNTIME_BOUNDARIES.md) defines the `local`/`test`/`staging`/`production` profiles, simulated-default adapters, real-provider opt-ins and privileged-action audit registry. [`AGE_ASSURANCE_BOUNDARY.md`](./AGE_ASSURANCE_BOUNDARY.md) states the jurisdiction, re-verification, signed-evidence and legal-review gates that are not yet satisfied. [`CATALOGUE_PROVENANCE.md`](./CATALOGUE_PROVENANCE.md) separates the 12 demo products from the unverified-import path, and [`VALIDATION_STATUS.md`](./VALIDATION_STATUS.md) reconciles planning claims with the checks that actually ran. Commercial licence evidence and public launch remain disabled; see [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md).

---

## The Ecosystem at a Glance

The canonical target is ten product modules on one platform and one data flywheel, with **separate identities, roles and compliance boundaries** for consumer, merchant, distributor, investor and internal Admin use. In Phase 1, only the local Prototype demos mapped above exist. See [`IDENTITY_ACCESS_BOUNDARIES.md`](./IDENTITY_ACCESS_BOUNDARIES.md).

| # | Module | Audience | Design intent and Prototype subset (not live capability) |
|---|---|---|---|
| 1 | **Vintora Market** | Consumers | Age-gated B2C marketplace, 10M SKU target, curated + long-tail discovery |
| 2 | **Vintora Trade** | Restaurants, retailers, distributors | B2B wholesale procurement, RFQs, contracts, credit terms |
| 3 | **Vintora Sommelier** | Everyone | Conversational AI pairing, tasting, education, multilingual + voice |
| 4 | **Vintora Assist** | Consumers & sellers | AI shopping concierge: search, cart, gifting, support, cross-sell |
| 5 | **Vintora Studio** | Brands & sellers | Generative AI marketing suite: copy, imagery, campaigns, audiences |
| 6 | **Vintora Seller** | Producers, merchants | Merchant OS: listings, inventory, orders, analytics, payouts |
| 7 | **Vintora Flow** | Supply chain | Multimodal freight, cold chain, customs, last-mile delivery |
| 8 | **Vintora Club** | Consumers | Curated subscription boxes, tasting experiences, tiered membership |
| 9 | **Vintora Vault** | Collectors & investors | Fine-wine investment, fractional ownership, custody, secondary market |
| 10 | **Vintora Rewards** | Everyone | Unified loyalty points, tiers, experiences, partner network |

**Surfaces (current state vs target):** the local vanilla-JavaScript storefront and Express API are **Prototype**. The Next.js web shell and Expo mobile placeholder are **Design** scaffolds. Conversational/voice/WhatsApp/AR surfaces, 24 launch languages → 60+, 135+ currencies and RTL support are **Design** targets; the prototype exposes three UI locales and eight demo FX rates.

---

## Deliverables Index

All deliverables below are **Design**-state documents. The descriptions specify intent, not live modules or validated results.

| # | Document | Owner lens | What you'll find |
|---|---|---|---|
| 01 | [Business Plan](./01-business-plan.md) | Founder / COO | Market opportunity, solution, GTM, operations, risks, financial plan, funding |
| 02 | [Revenue Model](./02-revenue-model.md) | CFO | Monetization matrix, pricing tiers, unit economics, revenue waterfall, sensitivity |
| 03 | [Technical Architecture](./03-technical-architecture.md) | CTO / Principal Architect | System diagrams, service catalogue, API strategy, AI platform, scale to 100M, SLOs |
| 04 | [Database Design](./04-database-design.md) | Staff Data Engineer | SQL DDL, ER diagram, knowledge graph, vector index, CDC, analytics, capacity |
| 05 | [UI/UX Wireframes](./05-ui-ux-wireframes.md) | Design Director | Design system, 14 annotated ASCII wireframes, flows, localization, component inventory |
| 06 | [AI Features](./06-ai-features.md) | Chief AI Officer | 12 AI capability deep dives, RAG architecture, model routing, evals, responsible AI |
| 07 | [Marketing Strategy](./07-marketing-strategy.md) | CMO | Positioning, 6 personas, market sequencing, channels, content engine, campaigns, budget |
| 08 | [Launch Roadmap](./08-launch-roadmap.md) | COO | Phase 0–5 Gantt, hiring, capital plan, licensing, risk register, go-live checklists |
| 09 | [Growth Strategy](./09-growth-strategy.md) | Growth Lead | Growth tree, five scaling stages, viral loops, retention, expansion, M&A, dashboard |
| 10 | [Investor Pitch Deck](./10-investor-pitch-deck.md) | Founder / Storyteller | 20 Design-state slides + appendix, visual direction and speaker notes; not investor evidence |
| 11 | [B2B Wholesale Module](./11-b2b-wholesale-module.md) | Trade / Product Lead | Global B2B marketplace: participants, architecture, domain model, seven end-to-end workflows, state machines, credit/negotiation engines, compliance, APIs and rollout |
| 12 | [AI Sommelier Module](./12-ai-sommelier-module.md) | Chief AI Officer / Product Lead | Master-sommelier design: six capabilities, conversation architecture, recommendation engine, taste-profile learning, nine production prompts, workflows, AI architecture, safety, evaluation and rollout |
| 13 | [AI Shopping Assistant Module](./13-ai-shopping-assistant-module.md) | Chief AI Officer / Growth Lead | Vintora Assist: discovery, personalized picks, transparent upsell/cross-sell, age-assured gifting, Club subscriptions; 8 conversation flows, 11 prompts, action-confirmation architecture |
| 14 | [AI Content Generator Module](./14-ai-content-generator-module.md) | Chief AI Officer / Brand Lead | Vintora Studio: product descriptions, blogs, SEO, social, email and ad copy; 29-prompt library, FACT_PACKET grounding, compliance gate, brand-voice scoring and tier gates |
| 15 | [Seller Dashboard Module](./15-seller-dashboard-module.md) | Seller / Product Lead | Vintora Seller: 8-screen merchant OSS covering products, inventory, orders, analytics, customers, revenue and AI recommendations; UI wireframes, Citus/RLS schema and CDC pipeline |
| 16 | [Logistics & Delivery Module](./16-logistics-delivery-module.md) | Supply Chain / CTO | Vintora Flow: global logistics platform with shipping integrations, warehouse management, delivery tracking, customs, tax automation and route optimization; seven workflows, event contracts and backend architecture |
| 17 | [Membership & Subscription Module](./17-membership-subscription-module.md) | Club / Product Lead | Vintora Club: subscription engine specification — monthly club, exclusive allocation, AI-personalized boxes, VIP progression, early-access drops and referrals; lifecycle state machine, billing/dunning, Citus/RLS schema |
| 18 | [Loyalty & Rewards Module](./18-loyalty-rewards-module.md) | Rewards / Growth Lead | Vintora Rewards: Starbucks-style loyalty for wine & spirits — points ledger, VIP tiers, cashback, referral rewards, badges and challenges; deterministic reward algorithms, Citus/RLS schema and event contracts |
| 19 | [AI Pricing Engine](./19-ai-pricing-engine.md) | Chief AI Officer / Pricing Lead | Six-model engine for dynamic pricing, competitor analysis, demand forecasting, margin optimization and promotions; RL shadow-mode workflow, guardrails, evaluation gates and Citus/RLS schema |
| 20 | [Wine Investment Marketplace](./20-wine-investment-marketplace.md) | Vault / Investment Product Lead | Vintora Vault: rare-wine listing, portfolio, forecast and secondary-trading design; stock-trading-style order-book and USDC-settlement concepts, canonical fee model and Citus/RLS architecture — Design only |
| 21 | [Admin Panel Module](./21-admin-panel-module.md) | Platform / Security Lead | Internal super-admin control center with 19 operation workspaces (ADM-01…ADM-19), including Ultimate AI TechOps; zero-trust RBAC, JIT/break-glass, four-eyes approvals, count-only DB coverage boundary and Citus/RLS schema |
| 22 | [Global Payments Module](./22-global-payments-module.md) | Payments Lead | Proposed shared payment layer for Stripe, PayPal, Apple Pay, Google Pay, Razorpay, bank transfers and 135+ currencies; locked-rate FX, 3DS2/SCA, ledger, reconciliation and PCI DSS L1 design — no provider integrations |
| 23 | [AI Marketing Automation Module](./23-ai-marketing-automation-module.md) | Growth / AI Lead | Automated ads, campaigns, emails, social posts, SEO and influencer outreach built on Vintora Studio; detailed workflow specifications, human-release guardrails, ≤8% spend cap, approval gateway and Citus/RLS schema — no live execution |
| 24 | [Ultimate AI TechOps Team](./24-ai-techops-team-module.md) | CTO / Platform SRE Lead | Design for an internal 24-agent technology operations team: architecture, multi-agent workflows, ADM-19 dashboard, tenant-isolated schema, alerting, logging, SLO monitoring, zero-trust security and human-led incident response for a 100M+ user design target |
| 25 | [Verified Catalogue Data Pipeline](./25-catalogue-data-pipeline.md) | Beverage Data / Catalog Lead | Source-bound ingestion from licensed supplier feeds and Open Food Facts, 25-field canonical contract, per-field confidence/provenance, honest 1,850-record coverage reporting and PostgreSQL/Supabase import |
| 26 | [Wine Accessories Catalogue Module](./26-wine-accessories-module.md) | Catalog / Ecommerce Architecture Lead | Nine-category accessories domain under Vintora Market: licensed/authorised image assets, image moderation, regional pricing, search indexing, deterministic SEO/bundles/cross-sells, validation gates and append-only audit |
| 27 | [Africa Marketplace Blueprint](./27-africa-marketplace.md) | Global Beverage Marketplace Strategist / Ecommerce Architect | 14-market expansion inside Vintora Market: country/currency/language registry, candidate brand onboarding, catalog templates, pricing, distributor, compliance, inventory, logistics, search and scale-architecture notes for 54 countries — no country activation |

> **Note:** Deliverables 21 (Admin Panel), 22 (Global Payments), 23 (AI Marketing Automation), 24 (Ultimate AI TechOps), 25 (Verified Catalogue Data Pipeline), 26 (Wine Accessories Catalogue Module) and 27 (Africa Marketplace Blueprint) are **internal platform/operations layers, catalogue domains or market expansions**, not additional market-facing modules. All 27 deliverables are **Design**-state documents; the ten modules and four internal layers are mapped to maturity states above. The canonical ten-module list is unchanged. The local Admin console exposes 19 internal workspaces in the **Prototype** state; its `/v1/admin/coverage` read is count-only and labels seeded demo data, while every mutation remains simulated. Current catalogue data is **12 demo SKU rows** (0 licensed feeds, 0 verified rows); the 1,850-record acquisition goal and the 10M+ SKU scale figure are **targets**, not current inventory. No real catalogue bulk dataset is bundled. Live use would require verified, licensed or authorised sources; none are bundled or evidenced here. **Vault is a non-live blueprint:** no regulated structure, licensed custodian, title opinion, KYC/AML provider, suitability process, independent reconciliation or real USDC settlement exists; no order, wallet, custody transfer or performance claim is live.

### Canonical inventory (generated)

<!-- docs-governance:start -->
| Item | Count / value |
|---|---|
| Market-facing modules | 10 |
| Internal layers | 4 |
| Admin workspaces | 19 |
| TechOps agents (ADM-19) | 24 |
| Design deliverables | 27 |
| Africa target markets | 14 |
| Current demo SKU rows | 12 |
| Licensed feeds / verified rows | 0 / 0 |
| SKU acquisition target | 1,850 |
<!-- docs-governance:end -->

Regenerate with `npm run docs:check -- --write-docs`. Ownership and schemas: [`DOCS_GOVERNANCE.md`](./DOCS_GOVERNANCE.md).

## Governance, compliance and release controls

| Document | Purpose |
|---|---|
| [`DISCLAIMER.md`](./DISCLAIMER.md) | Top-level maturity and compliance disclaimer; explicit NO-GO posture |
| [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) | Feature-status matrix across implementation, regulation and production readiness |
| [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) | Launch gate checklist and unresolved production blockers |
| [`API_POLICY.md`](./API_POLICY.md) | API versioning, compatibility, authentication, rate limiting, idempotency and audit requirements |
| [`IDENTITY_ACCESS_BOUNDARIES.md`](./IDENTITY_ACCESS_BOUNDARIES.md) and [`config/identity-access-policy.json`](./config/identity-access-policy.json) | B2C/B2B/Seller/Vault/Admin role, tenant, jurisdiction and transaction boundaries; `npm run identity:check` |
| [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md) | Reconciliation, refunds, disputes, payouts and segregation of duties |
| [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md) | Privacy-by-design, WCAG 2.2 AA and inclusivity requirements; no audit has been completed |
| [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md) and [`config/data-governance-policy.json`](./config/data-governance-policy.json) | Data inventory, lawful-basis register, identity separation, lifecycle, retention and cross-border transfer gates; `npm run data-governance:check` |
| [`DATABASE_OPERATIONS.md`](./DATABASE_OPERATIONS.md) and [`config/database-operations.json`](./config/database-operations.json) | Separate migrate/setup/dev-seed commands, migration checksums, profile/role guards, backup/restore and rollback procedure; `npm run db:ops:check` |
| [`CATALOGUE_PROVENANCE.md`](./CATALOGUE_PROVENANCE.md) and [`config/catalogue-provenance.json`](./config/catalogue-provenance.json) | Seed/licensed/verified/live record classes, static/API isolation, source freshness and simulated-only checkout; `npm run catalogue:provenance:check` |
| [`MARKETING_EXTERNAL_ACTIONS.md`](./MARKETING_EXTERNAL_ACTIONS.md) and [`config/marketing-external-actions.json`](./config/marketing-external-actions.json) | Sandbox-only external actions, human approval, preview, budget owner, legal review and kill switch; `npm run external-actions:check` |
| [`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md) and [`config/responsible-drinking-policy.json`](./config/responsible-drinking-policy.json) | Recommendation/purchase limits, harmful-use targeting denial, support notices, re-verification and policy review; `npm run responsible-drinking:check` |
| [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md) and [`config/market-forecasts.json`](./config/market-forecasts.json) | Sources, confidence levels and evidence status for every market figure |
| [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) | Ownership and four-eyes change control for `_canon.md` |
| [`DOCS_GOVERNANCE.md`](./DOCS_GOVERNANCE.md) and [`config/docs-governance.json`](./config/docs-governance.json) | Canonical schemas, 27 dated deliverable owners, link/number validation and generated README inventory; `npm run docs:check` |
| [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) and [`config/security-architecture.json`](./config/security-architecture.json) | Assets, trust boundaries, threats, session/RLS/encryption/supply-chain controls and incident playbooks; `npm run security:check` |
| [`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md) and [`config/capacity-model.json`](./config/capacity-model.json) | Workload model, SLO/error-budget policy, route p95/p99 targets and unrun test plans; `npm run scale:check` |
| [`ROADMAP.md`](./ROADMAP.md) | Design targets separated from locally runnable functionality and blocked work |
| [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) and [`config/high-risk-features.json`](./config/high-risk-features.json) | Legal/compliance activation gate; all high-risk features are blocked |
| [`JURISDICTION_COMPLIANCE.md`](./JURISDICTION_COMPLIANCE.md) and [`config/jurisdiction-compliance.json`](./config/jurisdiction-compliance.json) | Jurisdiction registry, regulated-activity/control map and launch-clearance gate; `npm run jurisdiction:check` |
| [`VAULT_LEGAL_BOUNDARIES.md`](./VAULT_LEGAL_BOUNDARIES.md) and [`config/vault-boundaries.json`](./config/vault-boundaries.json) | Non-live Vault blueprint, separation of ownership/custody/trading/settlement/advice and no real USDC settlement |
| [`FINANCIAL_ASSUMPTIONS.md`](./FINANCIAL_ASSUMPTIONS.md) and [`config/financial-assumptions.json`](./config/financial-assumptions.json) | Dated financial assumptions with definitions, source status and upside/base/downside ranges; `npm run financial:check` |
| [`AI_SAFETY_CONTROLS.md`](./AI_SAFETY_CONTROLS.md) and [`config/ai-safety-policy.json`](./config/ai-safety-policy.json) | Four-tier AI action taxonomy, grounding, prohibited recommendations, provenance and evaluation gates; `npm run ai:safety:check` |
| [`PRICING_CONTROLS.md`](./PRICING_CONTROLS.md) and [`config/pricing-controls.json`](./config/pricing-controls.json) | Recommendation-only pricing, variable exclusions, hard constraints, human approval and disparity gates; `npm run pricing:check` |
| [`ADMIN_ACCESS_CONTROLS.md`](./ADMIN_ACCESS_CONTROLS.md) and [`config/admin-access-policy.json`](./config/admin-access-policy.json) | Individual MFA accounts, 19 workspace-scoped roles, JIT/break-glass approval and audited sessions; `npm run admin:check` |
| [`ADAPTER_CAPABILITIES.md`](./ADAPTER_CAPABILITIES.md) and [`config/adapter-capability-policy.json`](./config/adapter-capability-policy.json) | Four adapter modes, mock defaults, kill switches and secret-free startup mode logs; `npm run adapters:check` |
| [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md) | Dependency and container-image maintenance, automated scanning, severity/patch timelines, immutable artifacts and release signing |
| [`LICENSE`](./LICENSE), [`NOTICE`](./NOTICE), [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md), [`ASSET_PROVENANCE.md`](./ASSET_PROVENANCE.md) and [`config/repository-policy.json`](./config/repository-policy.json) | Apache-2.0 first-party licence with trademark/data reservations, DCO, distinct review, rejection rules and asset provenance; `npm run policy:check` |
| [`SECURITY.md`](./SECURITY.md), [`config/security-reporting.json`](./config/security-reporting.json), [`security/audit-exceptions.json`](./security/audit-exceptions.json) and secret scanning | Private disclosure paths, response SLAs, dependency/SBOM policy, time-boxed exceptions and `npm run secrets:scan` |
| [`sbom/vintora.cdx.json`](./sbom/vintora.cdx.json) | CycloneDX 1.5 software bill of materials generated from `package-lock.json` |
| [`config/license-policy.json`](./config/license-policy.json) and [`config/artifact-policy.json`](./config/artifact-policy.json) | Licence allow/review/deny rules with named approvals; digest-pinned images and artifact policy |
| [`adr/`](./adr/README.md), [`ADR_PROCESS.md`](./ADR_PROCESS.md) and [`config/adr-process.json`](./config/adr-process.json) | Six indexed ADRs, repository-wide workflow, template and status vocabulary; `npm run adr:check` |
| [`CANONICAL_METADATA.md`](./CANONICAL_METADATA.md) and [`config/canonical-metadata.json`](./config/canonical-metadata.json) | Source-derived modules, regions, currencies, languages and counts; `npm run canonical:check` |
| [`EVIDENCE_INDEX.md`](./EVIDENCE_INDEX.md) and [`config/evidence-index.json`](./config/evidence-index.json) | Test, performance, threat-model and compliance-review links with explicit null gaps; `npm run evidence:check` |
| [`FIXTURE_TAXONOMY.md`](./FIXTURE_TAXONOMY.md) and [`config/fixture-taxonomy.json`](./config/fixture-taxonomy.json) | `demo`/`mock`/`synthetic`/`live` data classes and non-purchasable boundary; `npm run fixtures:check` |
| [`CLAIMS_CHANGE_MANAGEMENT.md`](./CLAIMS_CHANGE_MANAGEMENT.md) and [`config/claims-change-management.json`](./config/claims-change-management.json) | Owner/approver matrix for financial, safety and regulatory claim changes; `npm run claims-change:check` |
| [`STATUS_DASHBOARD.md`](./STATUS_DASHBOARD.md), [`RELEASE_GATES.md`](./RELEASE_GATES.md) and their `config/` registers | Static Phase 1 status, health contract and null-hosted-evidence release stages; `npm run status:check` |
| [`DATA_RETENTION_ARCHITECTURE.md`](./DATA_RETENTION_ARCHITECTURE.md) and [`config/data-retention-architecture.json`](./config/data-retention-architecture.json) | Retention/deletion behaviour by data class; design-only, no enforced job; `npm run retention:check` |
| [`NETWORK_ISOLATION.md`](./NETWORK_ISOLATION.md) and [`config/network-isolation-policy.json`](./config/network-isolation-policy.json) | Loopback bindings, internal data network and local-only secrets; `npm run network:check` |
| [`config/markdown-ci.json`](./config/markdown-ci.json) | Offline Markdown markers, relative links, JSON parse/shape and cross-reference consistency; `npm run markdown:check` and `npm run schemas:check` |
| [`.github/workflows/`](./.github/workflows/) | CI for typechecks/tests, governance, migrations, secret/licence/dependency/container/IaC scanning, build verification and signed releases |

### Repository ownership and review cadence

This README is the **onboarding** entry point. Investor-facing planning material and regulatory evidence are intentionally separated into [`INVESTOR_DOCUMENTATION.md`](./INVESTOR_DOCUMENTATION.md) and [`REGULATORY_DOCUMENTATION.md`](./REGULATORY_DOCUMENTATION.md); neither is approval evidence. Machine authority: [`config/docs-governance.json`](./config/docs-governance.json).

| Area | Owner role | Review cadence | Last reviewed | Approval linkage |
|---|---|---|---|---|
| README onboarding | Developer Experience / Platform Lead | monthly implementation review | 2026-11-21 | Distinct PR approver plus `docs:check`, `test-counts:check`, `claims:check`, `policy:check` |
| Investor documentation | Founder / Finance Lead | quarterly external review | 2026-11-21 | Four-eyes canon and forecast review before external use |
| Regulatory documentation | Legal / Compliance Lead | quarterly external review | 2026-11-21 | Counsel/compliance reviewer and change record required |
| Canonical metadata | Founder / Product Lead | monthly implementation review | 2026-11-21 | Canon RFC and distinct approver |

Canonical versions: canon `1.0`, policies `v1`, API `v1`. A documentation-only change cannot promote a feature, approve a claim or alter the NO-GO verdict.

**Internal reference:** [`_canon.md`](./_canon.md) — the single source of truth for names, numbers, and decisions; [`config/implementation-status.json`](./config/implementation-status.json) governs lifecycle state. Read both before authoring or reviewing.

**Build reference:** [`BUILDING.md`](./BUILDING.md) — setup, environment contract, seeded identities, API routes and verification commands for the modular storefront (`apps/prototype/`), the Express/PostgreSQL API (`services/api/`) and the shared domain package (`packages/shared/`). It also documents the longer-term Next.js and Expo shells.

### Dependency, vulnerability and supply-chain management

The repository defines automated weekly Dependabot PRs, a locked npm install, deterministic secret/licence scans, a retained CycloneDX SBOM, Trivy container and IaC scans, and a severity-based patch policy. Base images are pinned by registry digest and CI actions by commit SHA. Local verification covers deterministic scans and SBOM freshness; Trivy results, cosign signing and release promotion are **Design**-state workflow definitions with no local evidence attached. See [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md) for owners, patch timelines, exception rules, verification commands and the honest list of controls not yet exercised locally.

| Severity | Triage | Patch target |
|---|---|---|
| Critical | 4 business hours | Mitigate in 24 h; patch in 72 h; never exempt |
| High | 1 business day | 7 calendar days |
| Moderate | 5 business days | 30 calendar days |
| Low | Next maintenance cycle | 90 calendar days where practical |

---

## Suggested Next Steps

1. Follow the quick start above, then open <http://localhost:4000/?selftest=1> and review the prototype against [05 — UI/UX Wireframes](./05-ui-ux-wireframes.md).
2. Replace marked market estimates with sourced primary research.
3. Validate the licensing matrix per launch jurisdiction with local counsel.
4. Keep the API/storefront local and uncommitted until the seeded credentials and `.env` contract are replaced for any shared environment.
5. Convert the ASCII wireframes into a Figma library using the token tables; replace the deterministic Sommelier adapter with the RAG pipeline from [06 — AI Features](./06-ai-features.md).

*VINTORA — The World's Cellar, Intelligent.*
