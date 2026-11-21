# VINTORA — Product Canon (Single Source of Truth)

> Internal authoring spec. All deliverables MUST conform to these facts. Do not contradict or reinvent them.

## Governance

Canon facts and change control are governed by [CANON_GOVERNANCE.md](./CANON_GOVERNANCE.md). Numeric figures are management estimates tracked in [MARKET_FORECAST_PROVENANCE.md](./MARKET_FORECAST_PROVENANCE.md) and [config/market-forecasts.json](./config/market-forecasts.json) (`npm run forecasts:check`); high-risk feature activation is governed by [LEGAL_COMPLIANCE_SIGNOFF.md](./LEGAL_COMPLIANCE_SIGNOFF.md) and [config/high-risk-features.json](./config/high-risk-features.json) (`npm run gates:check`). This is a Phase 1 prototype: NO-GO for public launch, no real orders are placed. See also [PRIVACY_ACCESSIBILITY_INCLUSIVITY.md](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md), [IDENTITY_ACCESS_BOUNDARIES.md](./IDENTITY_ACCESS_BOUNDARIES.md) and [ROADMAP.md](./ROADMAP.md).

## Identity
- **Umbrella brand:** VINTORA (styled "Vintora" in prose).
- **Tagline:** *The World's Cellar, Intelligent.*
- **Mission:** Democratize the discovery, trade, and enjoyment of fine wine and spirits worldwide through applied AI — while protecting provenance, safety, and responsible consumption.
- **Founded:** 2026 (incorporated Q4 2026). **Dual HQ:** Singapore (APAC/ops) + New York City (Americas/commercial). Regional hubs: London, Paris, Amsterdam, Dubai, Tokyo, Sydney, São Paulo, Cape Town.
- **Category:** AI-native global beverage alcohol commerce + content + capital marketplace.

## Product Modules (use these exact names everywhere)
| Module | Name | One-liner |
|---|---|---|
| B2C Marketplace | **Vintora Market** | Curated consumer storefront, 10M SKU target, age-gated. |
| B2B Wholesale | **Vintora Trade** | Wholesale/Restaurant/HoReCa procurement, contracts, RFQs. |
| AI Sommelier | **Vintora Sommelier** | Conversational pairing + tasting + education agent. |
| AI Shopping Assistant | **Vintora Assist** | Cross-module concierge: search, cart, gifting, support. |
| AI Marketing Suite | **Vintora Studio** | Generative content + campaign + audience tools for sellers/brands. |
| Seller Dashboard | **Vintora Seller** | Merchant OSS: listings, inventory, orders, analytics, payouts. |
| Global Logistics | **Vintora Flow** | Multimodal freight, temperature control, customs, last-mile. |
| Subscription Club | **Vintora Club** | Curated monthly boxes + tasting experiences. |
| Wine Investment | **Vintora Vault** | Fractional/whole-lot fine-wine investing, custody, secondary market. |
| Loyalty | **Vintora Rewards** | Unified points, tiers, experiences, partner network. |

## Platform Surfaces
- Web: Next.js 15 (App Router), TypeScript, React Server Components, Turborepo monorepo.
- Mobile: React Native (Expo), shared design system, iOS + Android from one codebase.
- Conversational: web/mobile chat, WhatsApp, Messenger, voice (Alexa/Google Assistant), in-app AR label scan.
- Localization: 24 launch languages → 60+ by 2030; 135+ currencies; right-to-left support (Arabic, Hebrew).
- Market scope vocabulary: `phase 1` = canonical design launch markets (US, UK, Singapore), `planned` = sequenced after a phase gate, `target` = registry/catalogue domain with no activation approval. Platform totals (24 launch languages, 135+ currencies, 200+ countries) remain unmeasured design targets.
- Africa Marketplace is a **Prototype design-target catalogue/expansion domain inside Vintora Market**, not an eleventh module or a canonical launch phase. Its registry contains 14 target-market records, 15 configured currency codes (14 market currencies plus USD reference), five registry languages and a 54-country long-term scale target. No African country is approved, licensed or active; activation remains blocked by `africa-country-activation`. Registry languages/currencies are not active in staging or production.

## Technical Stack (canonical)
- **Languages:** TypeScript (web/mobile/BFF), Go (high-throughput services), Python (AI/ML/data), SQL.
- **Backend:** Kubernetes (EKS + GKE, multi-region active-active), NestJS BFF, Go microservices, gRPC internal, Kafka event bus, Istio service mesh.
- **API:** GraphQL (Apollo Federation) for clients, REST for public/partner API, gRPC for service-to-service.
- **Data:** PostgreSQL + Citus (sharded OLTP), TimescaleDB (telemetry), Redis (cache/session/cart), OpenSearch (search), ClickHouse (analytics), Neo4j (wine knowledge graph), S3-compatible object storage + CloudFront CDN, dbt + Snowflake warehouse, Delta Lake.
- **AI/ML:** Multi-model LLM gateway (frontier models + self-hosted fine-tuned open-weight models), RAG over Wine Knowledge Graph, pgvector/Milvus vector store, two-tower + transformer recommenders, XGBoost/LightGBM forecasting, computer vision (label OCR, authenticity, condition grading), speech ASR/TTS, reinforcement learning for pricing/inventory, anomaly detection for fraud. MLOps: MLflow, Feast feature store, Ray, Triton inference.
- **Payments:** Stripe + Adyen, local methods (Alipay, WeChat Pay, iDEAL, Klarna, Pix, UPI, SEPA, Apple/Google Pay), USDC settlement for Vault, FX engine with locked rates.
- **Observability:** OpenTelemetry, Grafana, Prometheus, Datadog, PagerDuty, SLO-driven.
- **Security/Compliance:** Zero-trust, mTLS, SOC 2 Type II, ISO 27001, PCI DSS L1, GDPR/CCPA/LGPD/PIPL, KYC/AML, age verification (global), alcohol licensing per jurisdiction, responsible-drinking guardrails.

## Scale Targets (canonical)
- 100M registered users / 60M MAU by 2034.
- 10M SKU target, 250k producers, 200+ countries served, 40+ licensed warehouses.
- Peak: 1.2M orders/day, 50k requests/sec at edge, p95 < 200ms API, 99.99% availability.
- 4.5B embeddings in vector index; 300M edges in wine knowledge graph.

## Financial Trajectory (canonical, USD)
| Year | Users | GMV | Net Revenue | Take Rate |
|---|---|---|---|---|
| 2027 (Y1) | 2M | $120M | $18M | 15.0% |
| 2028 (Y2) | 8M | $520M | $72M | 13.8% |
| 2029 (Y3) | 20M | $1.2B | $180M | 15.0% |
| 2031 (Y5) | 50M | $5.0B | $750M | 15.0% |
| 2034 (Y8) | 100M | $15B | $2.5B | 16.7% |

Revenue mix at scale (Y5): B2C commission 34%, B2B Trade 18%, Subscriptions/Club 12%, Seller+Studio SaaS 14%, Vault fees 10%, Logistics 6%, Rewards/partnerships 3%, Ads/data/API 3%.

## Revenue Model (canonical)
- B2C GMV commission 12–20% (tiered by category); premium/luxury 8–12%.
- B2B Trade 3–8% GMV + SaaS ($199–$1,499/mo) + financing/credit.
- Club: $29 / $59 / $119 / $199 per month tiers (Good/Better/Best/Icon).
- Seller: Free → $99 → $399 → $999/mo tiers + 0.5–2% payment processing.
- Studio: $199 / $599 / $2,999/mo (Creator/Brand/Enterprise) + usage credits.
- Vault: 1.5% buy-side + 2% sell-side, 0.5% p.a. custody, 5–15% performance fee above high-water mark, fractional minimum $25.
- Logistics: cost-plus freight, last-mile, insurance (0.3–1.2% of insured value), bonded warehousing.
- Rewards: partner interchange, co-branded cards, anonymized insights (privacy-safe).
- Advertising: promoted listings, sponsored content, brand takeovers (<= 8% of revenue by design).

## Launch Roadmap (canonical)
- **Phase 0 — Q4 2026:** Foundation, licensing, age/KYC, founder team, seed capital, supplier signing.
- **Phase 1 — Q1–Q2 2027:** MVP Market + Sommelier + Assist in US, UK, Singapore. Closed beta → launch.
- **Phase 2 — Q3–Q4 2027:** Trade, Seller, Flow, Rewards v1; EU (FR/DE/IT/ES/NL).
- **Phase 3 — 2028:** iOS/Android apps, Club, Studio v1, 12 languages, 10 currencies; Japan/UAE/Australia.
- **Phase 4 — 2029:** Vault launch, AI API licensing, 24 languages, LatAm; Series C.
- **Phase 5 — 2030–2034:** Global scale, 60+ languages, 100M users, profitability, IPO readiness.

## Competitive Set (canonical)
Vivino, Wine.com, Wine-Searcher, Vinous, Master of Malt, The Whisky Exchange, WineBid, Cult Wine / CultX, Alibaba/ JD wine, Drizly-style quick commerce, Liquor Control boards, general marketplaces (Amazon, eBay), incumbent distributors (Gallo, Diageo, Pernod Ricard direct), sommelier SaaS (Wine-Searcher Pro, Sommelier AI startups). Vintora wins via AI-native personalization + supply-side operating system + trust/provenance + capital layer.

## Core Differentiators (canonical)
1. Closed-loop AI: taste profile → discovery → purchase → consumption → review → better profile.
2. Provenance graph: producer → vineyard → vintage → bottle → custody chain, audit-ready.
3. Supply-side OS: one seller stack for D2C + wholesale + marketing + logistics.
4. Liquidity layer: turn a cellar into an investable, tradable asset class.
5. Compliance-by-design: age/KYC/licensing/responsible drinking embedded at every surface.

## Authoring Rules
- Write in confident, specific, operator-grade prose. Use tables, numbered lists, and concrete numbers. Avoid generic startup filler.
- Every doc must be self-contained (include a short "Canon snapshot" box) and cross-reference sibling docs by filename.
- Files live in `vintora/` with names: `01-business-plan.md` … `10-investor-pitch-deck.md`, plus `README.md`.
- Markdown only. Wireframes = ASCII/monospace boxes. Pitch deck = slide-by-slide markdown with speaker notes.
