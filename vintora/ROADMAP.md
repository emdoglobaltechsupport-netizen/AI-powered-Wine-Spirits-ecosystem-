# Vintora Roadmap — Design vs Prototype vs Planned Work

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE ROADMAP. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.** Nothing in this document is a shipping announcement.

## Canon snapshot

| Fact | Value |
|---|---|
| Tagline | *The World's Cellar, Intelligent.* |
| Market-facing modules | Exactly ten: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards |
| Internal layers | Admin Panel (19 workspaces), Global Payments, AI Marketing Automation, Ultimate AI TechOps (24 agents in `ADM-19`) |
| Phases | 0 (Q4 2026) → 5 (2030–2034) — all **TARGET / design** |
| Scale targets | 100M users, 10M SKU target, 200+ countries, 1.2M orders/day peak, p95 < 200 ms, 99.99% availability |
| Release verdict | NO-GO per [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) |

---

## 1. How to read this roadmap

Three distinct categories are separated deliberately:

1. **DESIGN DOCUMENTS** — deliverables 01–27 and governance specifications. They define intent, architecture and controls. **Documents 01–27 are not released products.** Owning a module doc does not mean a module is live.
2. **AVAILABLE LOCAL PROTOTYPE FUNCTIONALITY** — code that runs on a developer machine with bundled demo data via `npm run setup` / `npm run prototype`. It is a deterministic simulation.
3. **PLANNED / BLOCKED WORK** — gated future work. High-risk features are `blocked` in [`config/high-risk-features.json`](./config/high-risk-features.json) and validated by `npm run gates:check`.

The authoritative statement of what is implemented, regulated and not production-ready is [`FEATURE_STATUS.md`](./FEATURE_STATUS.md). The authoritative launch checklist is [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md). This roadmap never overrides either.

The canonical lifecycle states are **Design**, **Prototype**, **Pilot** and **Production**; no Phase 1 item is in the Pilot or Production state. Updates to investor or roadmap claims require the four-eyes review in [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) §§4 and 8 before publication, and a documentation-only change cannot promote an item to Pilot or Production.

---

## 2. Status legend

| Status | Meaning |
|---|---|
| **Design** | Canonical lifecycle state for documented intent with no runnable artifact; includes "Design target", "Design authority" and "Design requirement" below. No Phase 1 item is in **Pilot** or **Production**. |
| **Prototype** | Canonical lifecycle state for local runnable demos, simulated adapters and implemented API/schema controls. |
| **Pilot** | Restricted live operation with licensed providers and controlled users. Not present in Phase 1. |
| **Production** | Public live operation after security, reliability and compliance evidence plus explicit launch approval. Not present in Phase 1. |
| **Design target** | Documented intent only; no runnable artifact. |
| **Prototype available locally** | Runnable demo with deterministic/demo data; requires local setup. |
| **Implemented in API/schema** | Concrete code, migration, pipeline or control exists; still prototype-scope. |
| **Simulated** | Adapter or screen behaves deterministically; no real provider or effect. |
| **Planned** | Scheduled design work with no implementation yet. |
| **Blocked** | Requires legal, licensed-provider, security or operational gate before work can activate. |
| **NO-GO** | Must not be exposed to the public or used for live transactions in this phase. |

---

## 3. Deliverables 01–27 — status and what is actually runnable

| # | Deliverable | Status | What is actually runnable locally |
|---|---|---|---|
| 01 | Business Plan | Design target | Nothing. Market and financial figures are management estimates (`MARKET_FORECAST_PROVENANCE.md`). |
| 02 | Revenue Model | Design target | Nothing. Demo prices/fees are illustrative, not a billing system. |
| 03 | Technical Architecture | Design target | Subset: Express API, PostgreSQL migrations, CI scaffold via `npm run setup`; target Kubernetes/multi-region stack not deployed. |
| 04 | Database Design | Implemented in API/schema | PostgreSQL 16 migrations, tenant RLS, append-only Admin/catalogue audit; Citus/search/graph targets not built. |
| 05 | UI/UX Wireframes | Prototype available locally | Modular storefront screens and Admin shell (subset of wireframes); wireframes themselves are design artifacts. |
| 06 | AI Features | Simulated | Deterministic adapters for Sommelier, Assist, Studio and TechOps; no model calls or eval results. |
| 07 | Marketing Strategy | Design target | Nothing. No campaigns, ad accounts or spend. |
| 08 | Launch Roadmap | Design target | Nothing; all phases are targets with NO-GO gate status. |
| 09 | Growth Strategy | Design target | Nothing. No growth experiments or reported metrics. |
| 10 | Investor Pitch Deck | Design target | Presentation artifact only; not a product. |
| 11 | B2B Wholesale Module (Trade) | Simulated | Trade/RFQ screens and deterministic responses in the prototype. |
| 12 | AI Sommelier Module | Simulated | Grounded deterministic pairing with safety note; no model. |
| 13 | AI Shopping Assistant Module (Assist) | Simulated | Confirmation architecture and cross-module routing demo; no external actions. |
| 14 | AI Content Generator Module (Studio) | Simulated | Draft generation UI with rule-derived copy; no autonomous publishing. |
| 15 | Seller Dashboard Module (Seller) | Simulated | Seller screens with demo listings/inventory. |
| 16 | Logistics & Delivery Module (Flow) | Simulated | Shipment tracking demo with deterministic events. |
| 17 | Membership & Subscription Module (Club) | Simulated | Club tier/box screens; no billing. |
| 18 | Loyalty & Rewards Module (Rewards) | Simulated | Unified balance screen with demo points. |
| 19 | AI Pricing Engine | Design target | No autonomous pricing or promotions; high-risk gate applies. |
| 20 | Wine Investment Marketplace (Vault) | Simulated | Vault screens and fee explanation; custody/fractional title blocked (ADR-0004). |
| 21 | Admin Panel Module | Prototype available locally | 19-workspace console, count-only `GET /v1/admin/coverage`, guarded mutations, T3/T4 approvals, model and independent agent kill-switch controls. |
| 22 | Global Payments Module | Simulated | Simulated payment rows, 15-minute FX lock, idempotent order creation; no PSP/ledger. |
| 23 | AI Marketing Automation Module | Design target | No ad spend, email send or autonomous campaign; high-risk gate applies. |
| 24 | Ultimate AI TechOps Team | Simulated | `ADM-19` roster of 24 agents and six workflow panels; runtime advisory-only with allowlist, approval, isolation, append-only audit and safe-stop ([`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md), `npm run agents:check`). |
| 25 | Verified Catalogue Data Pipeline | Implemented in API/schema | `npm run catalogue:ingest/import/selftest` — 18 offline assertions; licensed feeds not bundled. |
| 26 | Wine Accessories Catalogue Module | Implemented in API/schema | `npm run accessories:ingest/import/selftest` — 36 offline assertions; rights gates specified. |
| 27 | Africa Marketplace Blueprint | Implemented in API/schema | `npm run africa:build/import/selftest` — 45 assertions; 14-market registry, no country activation. |

---

## 4. Governance documents — status and verification

| Document | Status | Runnable verification / boundary |
|---|---|---|
| [`_canon.md`](./_canon.md) | Design authority | Canon tests via `npm run test:shared`. |
| [`DISCLAIMER.md`](./DISCLAIMER.md) | Design authority | Maturity and "no real orders" boundary. |
| [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) | Design authority | Implementation/regulation/readiness matrix; NO-GO verdict. |
| [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) | Design authority | Unclosed launch gates; production startup guard. |
| [`API_POLICY.md`](./API_POLICY.md) | Design requirement | `npm run test:smoke`; version header and safe errors. |
| [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md) | Design requirement | Simulated payments only; ledger/disputes not implemented. |
| [`SECURITY.md`](./SECURITY.md) + [`sbom/`](./sbom/) | Implemented in API/schema (policy) | `npm run sbom:check`, `npm run secrets:scan`, CI gitleaks. |
| [`adr/`](./adr/README.md) | Design record | ADR-0001…0005 accepted for prototype scope only. |
| [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) | Design requirement | RFC, four-eyes, versioned changelog. |
| [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md) | Design requirement | `config/market-forecasts.json`; `npm run forecasts:check`. |
| [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) | Design requirement | `config/high-risk-features.json`, `config/launch-manifest.json`, `config/commercial-licensing-policy.json`; `npm run gates:check`, `npm run launch:check`. |
| [`VALIDATION_STATUS.md`](./VALIDATION_STATUS.md) | Design authority | Reconciles planning claims with machine-checked evidence; `npm run claims:check`. |
| [`COMMERCE_SAFEGUARDS.md`](./COMMERCE_SAFEGUARDS.md) | Implemented prototype control plane | `config/commerce-safeguards.json`; `npm run safeguards:check`; simulated only. |
| [`CATALOGUE_PROVENANCE.md`](./CATALOGUE_PROVENANCE.md) | Implemented prototype boundary | `config/catalogue-provenance.json`; `npm run catalogue:provenance:check`; no verified adapter. |
| [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md) | Design requirement | No privacy or accessibility audit completed. |
| [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md) | Implemented prototype control plane | `config/privacy-consent-policy.json`; `npm run privacy:check`; DPIA still outstanding. |
| [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md) | Implemented prototype control plane | `config/marketing-release-policy.json`; `npm run marketing:check`; no live release. |
| [`README.md`](./README.md) / [`BUILDING.md`](./BUILDING.md) | Prototype available locally | Local run instructions and verification commands. |

---

## 5. What can actually be run today

| Command / surface | Result | Boundary |
|---|---|---|
| `npm run setup` | Platform-neutral Docker Compose setup: generates credential-free `.env`, builds/starts db/redis/api/prototype, runs migrations and verification. | Local only; no real secrets or provider credentials. |
| `npm run prototype` | Static prototype storefront at `http://localhost:8123/`. | Deterministic demo catalogue; no API dependency. |
| `npm run dev:api` | Express API + modular storefront at `http://localhost:4000/`. | Simulated providers; `NODE_ENV=production` rejected. |
| `npm run test:smoke` | 34 API checks with API running. | Demo identities, labelled catalogue, fail-closed checkout safeguards, simulated order flow, privacy consent/DSAR and draft-only marketing controls. |
| `npm run catalogue:selftest` / `npm run accessories:selftest` / `npm run africa:selftest` | Independent offline assertion suites with generated totals (see register below). | Source data quality checks, not live market data. |
| `npm run ci:verify`, `npm run ci:build`, `npm run sbom:check`, `npm run secrets:scan` | Aggregate offline verification (identity, agent, privacy, marketing, safeguards, credentials, catalogue provenance, launch and claims checks), scoped builds, SBOM and secret checks. | Phase 1 gates only; not a launch approval. |
| `?selftest=1` | Browser self-test with generated pass/skip/fail totals. | Includes Admin/guard checks; simulated state. Does not include the offline suites. |
| `?view=admin` / `#admin` | 19-workspace Admin simulation, `⌘K` palette, guarded actions. | Count-only DB coverage; no real users or spend. |

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

---

## 6. Phase plan — TARGET / design only

All dates and outcomes below are canon targets. No phase has been executed in this repository; every gate is NO-GO until independently evidenced.

| Phase | Canon dates | Target outcome | Gate status |
|---|---|---|---|
| 0 — Foundation | Q4 2026 | Entities, licensing map, age/KYC vendor selection, founder team, seed capital, supplier signing, design system. | **NO-GO / not evidenced** |
| 1 — Proven PMF | Q1–Q2 2027 | MVP Market + Sommelier + Assist in US, UK, Singapore; closed beta → launch. | **Blocked** — simulated adapters, no providers |
| 2 — Supply-side OS | Q3–Q4 2027 | Trade, Seller, Flow, Rewards v1; EU expansion. | **Blocked** — licensing and KYC gates |
| 3 — Habit & Localisation | 2028 | iOS/Android apps, Club, Studio v1, 12 languages, 10 currencies; Japan/UAE/Australia. | **Blocked** — no models or country approvals |
| 4 — Capital Layer | 2029 | Vault launch, AI API licensing, 24 languages, LatAm. | **Blocked** — custody/legal opinions required |
| 5 — Global Scale | 2030–2034 | 60+ languages, 100M users, profitability, IPO readiness. | **NO-GO / design target** |

---

## 7. Planned / blocked work and not shipped

| Item | Status | Gate / next evidence |
|---|---|---|
| Live orders and payment capture | Blocked / NO-GO | Licensed PSP, PCI scope, ledger, reconciliation, disputes (`FINANCIAL_CONTROLS.md`) |
| Real age assurance and KYC | Blocked | Certified provider, DPIA, jurisdiction counsel |
| Live AI models, publishing and ad spend | Blocked | Eval gates, human release approval, kill-switch drill, ≤8% cap, alcohol-ad validation, high-risk sign-off |
| AI personalization and closed-loop profiling | Blocked | Purpose-limited consent receipts, withdrawal propagation, enforced retention, DSAR drill and completed DPIA; prototype purposes are off by default |
| Vault custody and fractional title | Blocked | Licensed custodian, legal opinions, investor protections (ADR-0004) |
| Real marketplace data, brands, distributors and prices | Blocked | Verified licensed feeds, rights evidence, supplier contracts |
| Country activation (including the Africa 14-market activation target) | Blocked | Local counsel, licences, tax rules, payment methods, jurisdiction clearance, `npm run gates:check` |
| Production IdP/MFA, distributed rate limiting, DR drill, pentest | Planned / Blocked | `LAUNCH_READINESS.md` gate checklist |
| Production deployment | NO-GO | All launch gates closed; startup guard replaced by audited launch controls |

**Not shipped:** live orders or payments, KYC/age-assurance providers, production AI models, custody or brokerage, real marketplace inventory/pricing, any country launch, and any production deployment. There is no accessibility or privacy audit, no load test, no penetration test and no reported business traction.

---

## 8. Governance references

- [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) — NO-GO gate checklist and deployment safeguard.
- [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) — implementation, regulation and readiness matrix.
- [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md), [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md), [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md), [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md).
- [`config/high-risk-features.json`](./config/high-risk-features.json) with `npm run gates:check`; [`config/market-forecasts.json`](./config/market-forecasts.json) with `npm run forecasts:check`.
