# Vintora — Maturity and Compliance Disclaimer

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION.** This repository is a local demonstration and engineering foundation. It is **NO-GO for public production launch**.

> **Prototype mode — no real orders are placed.** Payments, age/KYC, AI, logistics, custody and provider calls are simulated or deterministic behind adapter interfaces. No real transaction, campaign, age check, asset transfer or regulated activity is performed.

---

## 1. What this repository is

- A runnable vanilla-JavaScript storefront covering the locked ten market-facing modules and a 19-workspace internal Admin simulation.
- An Express + TypeScript API backed by PostgreSQL 16 migrations and clearly labelled demo seed data.
- Source-gated catalogue pipelines for beverages, Wine Accessories and an Africa Marketplace registry.
- A documentation suite, architecture decision records, SBOM, dependency policy, CI workflows and governance specifications, all in the Design state for launch purposes.
- Explicit maturity states — Design, Prototype, Pilot and Production — with the ten-module and environment mapping in [`README.md`](./README.md); no component is Pilot or Production.

## 2. What this repository is not

- **Not a live alcohol marketplace.** No licence, permit, distributor agreement, supplier contract or brand authorisation is bundled.
- **Not a Pilot or Production environment.** `NODE_ENV=production` is rejected and no licensed-provider pilot exists.
- **Not a payment processor, PSP integration or ledger of record.** Payment rows are simulated; no card data is accepted; no money moves.
- **Not an age-assurance or KYC provider.** Age checks are local, deterministic and stored only for the demo flow.
- **Not a licensed custodian, exchange, broker-dealer or fiduciary.** Vault and fractional-ownership concepts are design simulations only.
- **Not an AI model provider.** Sommelier, Assist, Studio and TechOps use deterministic adapters and labelled rule-derived output.
- **Not legal, tax, regulatory, security or compliance advice.** Every jurisdiction requires qualified local review before launch.
- **Not a statement of real traction.** All market, financial, scale and performance figures are projections, targets or demo values.

## 3. Data and asset policy

- Bundled products, prices, availability, ratings, reviews, barcodes, awards and images are illustrative demo data.
- Real catalogue records enter only through verified supplier/brand feeds with provenance, confidence and rights metadata.
- Official and lifestyle images require licensed or authorised asset records and approved moderation.
- Reserved domains such as `example.invalid` are test-only and rejected by production import gates.
- The Africa Marketplace contains candidate brand names and draft listing templates. It does **not** assert real listings, prices, regulatory approval or payment integrations.

## 4. Compliance posture

| Domain | Current posture | Required before launch |
|---|---|---|
| Alcohol sales | Age gate demo; no jurisdictional licensing | Local counsel approval, age assurance, KYC, alcohol licences, advertising rules |
| Payments | Simulated adapter, 15-minute FX lock | Licensed PSP, PCI DSS scope review, ledger, reconciliation, disputes |
| Tax | Reference currencies and rule tables; no rates asserted | Country/region tax rules, excise/VAT registration, tested calculation engine |
| AI | Deterministic adapters, human release gates, derived labels; internal agents advisory-only with allowlist, append-only audit and independent safe-stop; personalization off by default and marketing draft-only | Evaluated models, safety reviews, DPIA, sandbox/canary/replay evidence, timed kill switch drill, alcohol-ad validation and independent agent review |
| Custody / Vault | Simulated only | Licensed custodian, segregation, legal opinions, investor protections |
| Data protection | Placeholder contract only | DPIA, privacy notices, DSAR process, retention/deletion enforcement |
| Security | Session demo, append-only Admin and authorization audit, deny-by-default prototype policy | Production IdP, MFA, live elevation on every privileged route, rate limiting, distributed audit, pentest, monitoring |
| Identity boundaries | Simulated role/tenant/jurisdiction separation in [`IDENTITY_ACCESS_BOUNDARIES.md`](./IDENTITY_ACCESS_BOUNDARIES.md) | Real KYB, licence, contract, investor eligibility and independently tested tenant isolation |

## 5. Production safeguard

`NODE_ENV=production` is deliberately rejected at startup. That guard must remain until real providers, legal approvals, operational controls and the launch gates in [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) are complete.

## 6. Related governance documents

- [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) — implementation, regulation and production-readiness matrix.
- [`API_POLICY.md`](./API_POLICY.md) — versioning, compatibility, auth, rate limiting, idempotency and audit requirements.
- [`IDENTITY_ACCESS_BOUNDARIES.md`](./IDENTITY_ACCESS_BOUNDARIES.md) — B2C/B2B/Seller/Vault/Admin separation; all records and permissions are prototype-only.
- [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md) — 24 ADM-19 agents are internal and advisory-only; no autonomous execution exists.
- [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md) — personalization is off by default; no DPIA, retention job or production DSAR exists.
- [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md) — campaigns are advisory drafts; no live ad platform, spend, email send or automatic publishing exists.
- [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md) — reconciliation and dispute workflows.
- [`SECURITY.md`](./SECURITY.md) — dependency/security policy and SBOM.
- [`adr/`](./adr/README.md) — architecture decision records.
- [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) — launch gate checklist.

Nothing in this repository should be represented as a live marketplace, a regulated financial service, a licensed alcohol seller or a production AI system.
