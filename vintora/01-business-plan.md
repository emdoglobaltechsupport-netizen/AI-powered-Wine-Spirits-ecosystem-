# VINTORA — Business Plan

> *The World's Cellar, Intelligent.*

---

## Canon snapshot (binding source of truth)

| Item | Canonical fact |
|---|---|
| **Umbrella brand** | VINTORA (styled "Vintora" in prose) |
| **Tagline** | *The World's Cellar, Intelligent.* |
| **Mission** | Democratize the discovery, trade, and enjoyment of fine wine and spirits worldwide through applied AI — while protecting provenance, safety, and responsible consumption. |
| **Founded** | 2026 (incorporated Q4 2026) |
| **Dual HQ** | Singapore (APAC/ops) + New York City (Americas/commercial) |
| **Regional hubs** | London, Paris, Amsterdam, Dubai, Tokyo, Sydney, São Paulo, Cape Town |
| **Category** | AI-native global beverage alcohol commerce + content + capital marketplace |
| **10 modules** | Vintora Market, Vintora Trade, Vintora Sommelier, Vintora Assist, Vintora Studio, Vintora Seller, Vintora Flow, Vintora Club, Vintora Vault, Vintora Rewards |
| **Scale target (2034)** | 100M registered users / 60M MAU; 10M SKU target; 250k producers; 200+ countries; 40+ licensed warehouses |
| **Peak load** | 1.2M orders/day; 50k req/sec at edge; p95 < 200ms; 99.99% availability |
| **AI scale** | 4.5B embeddings; 300M edges in wine knowledge graph |
| **Y1 2027** | 2M users · $120M GMV · $18M net revenue · 15.0% take rate |
| **Y8 2034** | 100M users · $15B GMV · $2.5B net revenue · 16.7% take rate |

All figures in this document conform to `_canon.md`. Interpolated or modelled figures are explicitly labelled "estimate." Revenue architecture lives in `02-revenue-model.md`; architecture, data, UX, AI, marketing, launch, growth, and investor materials are cross-referenced by filename throughout.

---

## 1. Executive summary

Vintora is building the first AI-native operating system for the global beverage alcohol economy — a single platform where a consumer discovers a bottle, a sommelier agent explains it, a merchant lists and markets it, a distributor sources it, a logistics network moves it under temperature control, a subscriber receives it monthly, and an investor trades it as an asset. Ten product modules — **Vintora Market, Vintora Trade, Vintora Sommelier, Vintora Assist, Vintora Studio, Vintora Seller, Vintora Flow, Vintora Club, Vintora Vault, Vintora Rewards** — compose a closed loop that no incumbent offers end to end.

The opportunity is large and structurally fragmented. Global alcohol is a roughly $1.8 trillion category (management estimate), yet e-commerce penetration remains in the high single digits, wholesale procurement is still dominated by phone and spreadsheet, and fine wine remains an estimated $15 billion investment AUM asset class with thin, opaque secondary liquidity. Vintora attacks all three gaps simultaneously with a trust layer — provenance graph, age/KYC verification, and compliance-by-design — that makes AI-driven discovery commercially safe.

The financial trajectory is deliberate. From **2M users, $120M GMV and $18M net revenue in 2027 (Y1)**, Vintora scales to **100M users, $15B GMV and $2.5B net revenue in 2034 (Y8)**, with blended take rate expanding from 15.0% to 16.7% as higher-yield SaaS, Vault, and subscription lines grow faster than GMV. Revenue mix at Y5 is anchored by B2C commission (34%) with meaningful contributions from B2B Trade (18%), SaaS (14%), and Club (12%). The model is capital-efficient at maturity: subscription and SaaS recurring revenue plus a capital-light, cost-plus logistics layer produce a Rule-of-40 profile that turns positive in the mid-2020s and strengthens into the IPO window.

Vintora is incorporated Q4 2026 with dual headquarters in Singapore and New York City, and raises across Seed, Series A, Series B, and Series C (2029, per the canonical roadmap) to fund licensing, technology, warehouse network, and market entry. The exit vision is a public listing in the 2032–2035 window, with a strategic acquisition as a credible alternative.

---

## 2. Problem & market opportunity

### 2.1 The problem

Fine wine and spirits suffer from four structural frictions:

1. **Discovery is broken.** Choice is overwhelming (millions of SKUs) and existing search is keyword-based, not taste-based. The average consumer cannot translate "I liked a Northern Rhône Syrah" into a confident next purchase.
2. **Trust is expensive.** Counterfeit, mislabeled, and poorly stored bottles destroy buyer confidence. Provenance and custody are documented on paper, if at all.
3. **Supply is fragmented.** Producers, wholesalers, and HoReCa buyers operate on disconnected systems. A merchant who sells D2C cannot easily also sell wholesale, market campaigns, and arrange compliant cross-border fulfillment.
4. **Capital is trapped.** A fine-wine cellar is illiquid. There is no standardized, fractional, custodied, secondary-tradable market with institutional-grade settlement.

### 2.2 Market sizing — top-down and bottom-up

All figures are **management estimates** triangulated from public category data; they are to be validated during Series A diligence.

**Top-down TAM (global alcohol, 2025 baseline — estimate):**

| Layer | Estimate | Basis |
|---|---|---|
| Global alcohol market | **$1.8T** | Estimate: total beverage alcohol retail + on-trade |
| Alcohol e-commerce penetration | ~6–7% | Estimate: post-pandemic digitization curve |
| Wine + spirits e-commerce | **~$120B** | Estimate: 6.7% of $1.8T |
| B2B wholesale / distribution | **~$700B** | Estimate: global drink distribution and HoReCa supply |
| Fine wine investment AUM | **~$15B** | Estimate: investable cellars + funds |
| Wine subscription / clubs | **~$5B** | Estimate: recurring direct-to-consumer boxes |
| Marketing SaaS (vertical) | **~$3B** | Estimate: brand/merchant marketing tooling |
| Alcohol/wine logistics & warehousing | **~$40B** | Estimate: freight, bonded storage, last mile |

**Bottom-up SAM (digitally serviceable slice by module — estimate):**

| Vintora line | Addressable slice | SAM estimate |
|---|---|---|
| Vintora Market (B2C) | Full wine + spirits e-commerce | $120B |
| Vintora Trade (B2B) | Digitizable wholesale (~10% of $700B) | $70B |
| Vintora Vault | AUM + secondary trading turnover | $15B |
| Vintora Club | Subscription category | $5B |
| Vintora Seller + Vintora Studio | Merchant/brand software + marketing | $11B |
| Vintora Flow | Cross-border & temperature-controlled logistics | $12B |
| Ads / data / API | Category digital advertising (portion) | $8B |
| **Total SAM (de-duplicated)** | | **~$240B** |

**SOM (serviceable obtainable market):** The canonical Y8 target of **$15B GMV** equals **0.83% of the $1.8T top-down TAM** and **~6.3% of the ~$240B bottom-up SAM** — an achievable share for a platform with a multi-sided, module-spanning value proposition. On a net-revenue basis, $2.5B is ~1.0% of SAM.

The strategic point: no single module requires Vintora to win an entire market. The platform wins by capturing a modest share across seven adjacent pools, then compounding them through cross-module data and loyalty.

### 2.3 Competitive positioning

| Competitor set (canonical) | What they own | Vintora's structural advantage |
|---|---|---|
| Vivino, Wine-Searcher, Vinous | Discovery, ratings, reference data | Vintora converts discovery into a closed transaction and enriches a proprietary provenance graph rather than an open rating index |
| Wine.com, Master of Malt, The Whisky Exchange | D2C retail | Vintora adds B2B, capital, marketing, and logistics modules on the same merchant stack |
| WineBid, Cult Wine / CultX | Auction / investment | Vintora offers fractional entry ($25 minimum), custody, and a continuous secondary market, not episodic auctions |
| Gallo, Diageo, Pernod Ricard direct | Brand-owned D2C | Vintora is neutral infrastructure serving all producers, with 10M SKU target breadth no single brand can match |
| Amazon, eBay, quick commerce | General marketplace reach | Vintora is category-specialist: age-gating, provenance, cold chain, and excise handled natively |
| Liquor control boards | Regulatory legitimacy | Vintora partners with licensed operators per jurisdiction and exports compliance as software |
| Sommelier SaaS startups | Point AI tools | Vintora's AI is trained on closed-loop consumption data across commerce, content, and capital |

The defensible position is the intersection: no competitor spans commerce, content, capital, and compliance simultaneously. Vintora's module attachment model means each new module lowers the effective CAC of the next — a structurally lower cost to serve than single-line rivals.

---

## 3. Solution & product portfolio

The ten modules are designed as one closed loop: taste profile → discovery → purchase → consumption → review → better profile, with provenance and compliance embedded throughout (see `06-ai-features.md` and `05-ui-ux-wireframes.md`).

| # | Module (canonical name) | Buyer | Value proposition | Monetization link |
|---|---|---|---|---|
| 1 | **Vintora Market** | Consumers (21+) | Curated, age-gated storefront with 10M SKU target, AI discovery, verified provenance | 12–20% GMV commission (8–12% premium/luxury) |
| 2 | **Vintora Trade** | Wholesalers, restaurants, HoReCa | Procurement, contracts, RFQs, and credit in one place | 3–8% GMV + $199–$1,499/mo SaaS + financing |
| 3 | **Vintora Sommelier** | Consumers, trade, hospitality | Conversational pairing, tasting notes, education agent | Drives conversion & retention across Market/Club; AI API licensing at scale |
| 4 | **Vintora Assist** | All users | Cross-module concierge: search, cart, gifting, support | Reduces CAC/support cost; lifts AOV and repeat rate |
| 5 | **Vintora Studio** | Sellers, brands | Generative content, campaigns, audience tools | $199/$599/$2,999/mo + usage credits |
| 6 | **Vintora Seller** | Merchants | OSS for listings, inventory, orders, analytics, payouts | Free→$99→$399→$999/mo + 0.5–2% payment processing |
| 7 | **Vintora Flow** | Merchants, trade, consumers | Multimodal freight, temperature control, customs, last mile | Cost-plus freight, last-mile, insurance (0.3–1.2% insured value), bonded warehousing |
| 8 | **Vintora Club** | Consumers | Curated monthly boxes + tasting experiences | $29/$59/$119/$199 per month (Good/Better/Best/Icon) |
| 9 | **Vintora Vault** | Investors, collectors | Fractional/whole-lot investing, custody, secondary market | 1.5% buy + 2% sell, 0.5% p.a. custody, 5–15% performance fee; $25 minimum |
| 10 | **Vintora Rewards** | All users, partners | Unified points, tiers, experiences, partner network | Partner interchange, co-branded cards, privacy-safe insights |

Two modules are direct revenue engines (Market, Trade), three are recurring revenue engines (Club, Seller, Studio), one is a capital-markets engine (Vault), one is a services engine (Flow), and three are force multipliers that lift conversion, retention, and take rate (Sommelier, Assist, Rewards). This structure is the reason blended take rate rises from 15.0% to 16.7% by Y8 even as GMV grows 125-fold.

---

## 4. Why now

1. **AI maturity.** Multi-model LLM gateways, retrieval-augmented generation over a 300M-edge wine knowledge graph, and fine-tuned open-weight models make a genuinely expert sommelier agent economically viable for the first time. Computer vision can now grade label authenticity and bottle condition at scale (`06-ai-features.md`, `03-technical-architecture.md`).
2. **Post-pandemic digitization.** Alcohol e-commerce penetration jumped permanently and consumers now accept home delivery of age-restricted goods with verified ID.
3. **Direct-to-consumer shift.** Producers are actively disintermediating traditional distribution; Vintora Seller gives them a single stack for D2C, wholesale, marketing, and logistics — the supply-side operating system incumbents cannot offer.
4. **Fine wine as an asset class.** With 4.5B-embedding semantic search and an auditable custody chain, fractional, tradable cellar exposure becomes investable and institutionally legible for the first time.
5. **Fragmentation.** No player combines commerce, content, capital, and compliance across 200+ countries. Vivino, Wine.com, Wine-Searcher, CultX/WineBid, incumbent distributors (Gallo, Diageo, Pernod Ricard), and general marketplaces each own one slice. Vintora owns the seams.

---

## 5. Business model & revenue model summary

Vintora earns a take rate on transactional GMV, recurring SaaS and subscription fees, asset-based fees on Vault AUM, and a cost-plus logistics spread, with advertising capped at ≤8% of revenue by design. The canonical trajectory runs from $18M net revenue on $120M GMV (Y1) to $2.5B on $15B GMV (Y8). Blended take rate is 15.0% / 13.8% / 15.0% / 15.0% / 16.7% across Y1 / Y2 / Y3 / Y5 / Y8 respectively; the dip in Y2 reflects the GMV-heavy early mix, and the Y8 expansion reflects SaaS, Vault, and subscription compounding.

Full charge triggers, pricing tables, take-rate math, the $120 bottle worked example, CAC/LTV by segment, the Y1–Y8 waterfall, Y5/Y8 mix, ancillary revenues, FX/tax treatment, and sensitivity analysis are specified in **`02-revenue-model.md`**.

---

## 6. Go-to-market overview

GTM is sequenced by the canonical roadmap (`08-launch-roadmap.md`): Phase 1 (Q1–Q2 2027) launches Market + Sommelier + Assist in the US, UK, and Singapore; Phase 2 (Q3–Q4 2027) adds Trade, Seller, Flow, and Rewards v1 plus EU (FR/DE/IT/ES/NL); Phase 3 (2028) ships iOS/Android apps, Club, Studio v1, 12 languages and 10 currencies with Japan, UAE, and Australia; Phase 4 (2029) launches Vault, AI API licensing, 24 languages and LatAm with Series C; Phase 5 (2030–2034) scales to 60+ languages, 100M users, and profitability.

Acquisition blends AI-led organic discovery (Sommelier as a search engine substitute), supplier-led co-marketing (Studio gives merchants a reason to bring their audience), trade sales motion, and lifecycle CRM on Rewards. Detailed channel economics, funnel targets, and growth loops are in **`07-marketing-strategy.md`** and **`09-growth-strategy.md`**.

---

## 7. Operations & supply chain

- **Sourcing.** Direct producer agreements plus authorised wholesalers, targeting 250k producers and 10M SKU target. Vintora Seller onboarding includes provenance attestation and label/OCR authenticity checks at listing.
- **Bonded warehouses.** Build toward 40+ licensed warehouses by 2034. Bonded storage defers excise/duty until goods enter consumption, improving working capital and enabling cross-border Vault custody.
- **Temperature-controlled logistics.** Vintora Flow coordinates multimodal freight, cold-chain handling, customs brokerage, and age-verified last mile. Condition telemetry is written to TimescaleDB and surfaced on the provenance graph.
- **Licensing.** Alcohol licences are held or partnered per jurisdiction at every node — marketplace, warehouse, and last mile — with the compliance function owning the licence register.
- **3PL vs owned.** Asset-light by default: certified 3PL partners and bonded warehouses under long-term SLAs, with selective owned capacity in gateway hubs (Singapore, Amsterdam, New Jersey) where control of custody and margin justifies capex.
- **Claims/damage.** Standardized claims workflow with condition photography at handoff, insurance-backed remediation, and seller/3PL chargeback rules encoded in Flow.
- **Insurance.** Cargo, inventory, and product liability coverage; Flow offers shipment insurance at 0.3–1.2% of insured value, a recurring ancillary margin line.

**Operating cadence.** Licensing is a gating workflow, not a post-launch task: before a country is enabled, the compliance function confirms marketplace permission, warehouse bonding, and last-mile carrier authority, and the platform's rule engine blocks transactions in any unlicensed jurisdiction. Supplier onboarding requires provenance attestation, label/OCR authenticity verification, and a signed indemnity; non-compliant listings are quarantined automatically. Carrier and 3PL partners are managed on scorecards measuring temperature excursion rate, damage rate, on-time delivery, and claims turnaround, with SLAs tied to rebates and renewal. Inventory is planned with XGBoost/LightGBM demand forecasting (`06-ai-features.md`) to position stock in the right bonded warehouse before demand arrives, reducing both working capital and delivery time.

---

## 8. Technology & AI moat

Vintora is AI-native, not AI-bolted-on. The stack — Next.js 15/TypeScript web, React Native mobile, NestJS BFF, Go microservices, Kafka, Kubernetes (EKS + GKE active-active), PostgreSQL+Citus, Neo4j knowledge graph, ClickHouse analytics, and a multi-model LLM gateway — is specified in `03-technical-architecture.md` and `04-database-design.md`. The moat is the **closed-loop data flywheel**: every interaction enriches the 300M-edge wine knowledge graph and 4.5B embeddings, which improves Sommelier and Assist, which lifts conversion and repeat purchase, which generates more data. Provenance graph + compliance-by-design + supply-side OS + liquidity layer form the four defensible assets described in `06-ai-features.md`.

---

## 9. Team & governance

**Founder leadership (named roles):**

| Role | Profile & mandate |
|---|---|
| **Chief Executive Officer (CEO)** | Founder-operator; category vision, capital formation, board management, dual-HQ strategy (Singapore/New York). |
| **Chief Technology Officer (CTO)** | Platform architecture, multi-region reliability (99.99%, p95 < 200ms), engineering org, security posture (`03-technical-architecture.md`). |
| **Chief AI Officer (CAIO)** | LLM gateway, knowledge graph, recommender/forecasting stack, MLOps, responsible-AI guardrails (`06-ai-features.md`). |
| **Chief Commercial Officer (CCO)** | Market + Trade GMV, supplier acquisition (250k producers), brand partnerships, revenue growth. |
| **Chief Supply Chain Officer (CSCO)** | Flow, bonded warehouse network (40+), 3PL management, cold chain, claims and insurance. |
| **Chief Compliance Officer (CCO-Legal)** | Alcohol licensing per jurisdiction, age/KYC/AML, GDPR/CCPA/PIPL, responsible drinking, product liability. |
| **Chief Financial Officer (CFO)** | Financial trajectory ownership, unit economics, fundraise, FX/tax, SEC readiness, investor reporting. |

**Board & advisors:** A board chaired by the CEO with independent directors in alcohol distribution, enterprise SaaS, and public-company governance; an advisory bench of master sommeliers, fine-wine auction specialists, former regulators, and logistics operators. (Named individuals to be confirmed at incorporation; no individual names are asserted here.)

**Hiring phases:** Phase 0 — founder team + licensing/legal + seed. Phase 1 — core engineering, AI, and launch operations in three markets. Phase 2 — trade sales, EU commercial, compliance expansion. Phase 3 — mobile, Studio, Club teams. Phase 4 — capital-markets/Vault team, AI API licensing, LatAm. Phase 5 — global functional leadership and public-company finance.

---

## 10. Regulatory & risk register

| Risk | Jurisdiction / surface | Mitigation | Owner |
|---|---|---|---|
| Alcohol licensing | Per-country/state marketplace, warehouse, last-mile | Licence register; partner with licensed 3PLs; 'compliance-by-design' gating | Chief Compliance Officer |
| Age verification | All storefronts and delivery | Global age-gate + ID at delivery; re-verification on high-value orders | CTO + Compliance |
| KYC/AML | Vault, high-value B2B, payouts | Tiered KYC, sanctions screening, transaction monitoring | Compliance + CFO |
| Data privacy (GDPR/CCPA/PIPL, LGPD) | All user data, cross-border flows | Zero-trust, data residency, consent ledger, privacy-safe insights only | CTO + Compliance |
| Responsible drinking | Marketing, AI recommendations | Guardrails in Sommelier/Assist; spend/volume nudges; no targeting of minors | CAIO + Compliance |
| Excise & tax | Cross-border alcohol movement | Bonded warehousing; duty deferral; automated tax engine | CFO + CSCO |
| Trade sanctions / export controls | Cross-border B2B, Vault | Restricted-party screening; country blockade list | Compliance |
| Product liability / counterfeit | Listings, fulfillment | Provenance graph, condition grading, insurance, seller indemnity | CSCO + Compliance |
| Fraud & chargebacks | Payments, Vault | Anomaly detection, 3DS, reserves, dispute workflow | CTO + CFO |
| Currency / FX | 135+ currencies | Locked-rate FX engine; natural hedging; USDC for Vault settlement | CFO |
| Payment processing | All transactions | Stripe + Adyen, local methods, redundant PSPs | CFO + CTO |

---

## 11. Financial plan & unit economics

### 11.1 Canonical trajectory

| Year | Users | GMV | Net Revenue | Take Rate |
|---|---|---|---|---|
| 2027 (Y1) | 2M | $120M | $18M | 15.0% |
| 2028 (Y2) | 8M | $520M | $72M | 13.8% |
| 2029 (Y3) | 20M | $1.2B | $180M | 15.0% |
| 2031 (Y5) | 50M | $5.0B | $750M | 15.0% |
| 2034 (Y8) | 100M | $15B | $2.5B | 16.7% |

### 11.2 Unit economics (estimates at scale)

| Segment | CAC | Net rev / order (or ARPU) | Contribution margin | LTV (contribution) | LTV/CAC | Payback |
|---|---|---|---|---|---|---|
| B2C Market | $28 | $21.75/order @ 15% of $145 AOV | ~45% | ~$230 | ~8.2x | ~8 mo |
| B2B Trade | $3,500/account | $8,400/yr (5% of $48k GMV + $6k SaaS) | ~60% | ~$30k | ~8.6x | ~8 mo |
| Vintora Club | $35 | $79/mo blended ARPU | ~45% | ~$700 | ~20x | ~1 mo |
| Vintora Vault | $600 | $700/yr on ~$28k AUM | ~70% | ~$4,900 | ~8.2x | ~15 mo |
| Seller + Studio SaaS | $1,800 | $280/mo blended ARPA | ~80% | ~$11,200 | ~6.2x | ~8 mo |

Blended contribution margin on net revenue is estimated at 48% in Y1, expanding to ~60% by Y8 as SaaS, Vault, and subscription mix rises. Breakeven on an EBITDA basis is modelled for 2032 (Y6) at ~$7.2B GMV / $1.12B revenue (interpolated estimate). Full model detail in `02-revenue-model.md`.

### 11.3 Capex and opex structure

| Category | Nature | Primary drivers |
|---|---|---|
| Platform engineering (capitalized) | Capex | Multi-region Kubernetes, data platform, security tooling |
| AI compute and model training | Capex + variable opex | LLM gateway, vector index (4.5B embeddings), MLOps (Ray, Triton) |
| Warehouse & cold-chain equipment | Capex (selective owned hubs) | Bonded racking, temperature monitoring, condition cameras |
| Engineering & data headcount | Opex | Largest single cost line through Y5 |
| Compliance, licensing & legal | Opex | Per-jurisdiction licences, KYC/AML, privacy, excise filings |
| Performance marketing | Variable opex | CAC by segment; scales with GMV but falls as a % of revenue |
| 3PL & fulfilment | Variable opex | Cost-plus Flow model; largely pass-through |

The model is deliberately asset-light: owned capex is limited to gateway hubs where custody control and margin justify it, while the 40+ warehouse target is met primarily through bonded 3PL partners under long-term SLAs. This keeps the balance sheet friendly and the incremental return on capital high as GMV scales 125x from Y1 to Y8.

---

## 12. Funding requirements & use of funds

| Round | Timing | Raise (estimate) | Primary milestones |
|---|---|---|---|
| Seed | Q4 2026 | $15M | Licensing, founder team, age/KYC, MVP build, supplier signing (Phase 0) |
| Series A | 2027 | $60M | US/UK/SG launch, 2M users, $120M GMV, Trade/Seller/Flow v1 |
| Series B | 2028–2029 | $200M | Apps, Club, Studio, 20M users, $1.2B GMV, EU + APAC |
| Series C | 2029 | $400M | Vault, AI API licensing, 24 languages, LatAm, 50M-user path |

**Dilution framework (estimate):** cumulative dilution of ~45–55% from Seed through Series C, targeting founder + employee ownership above 30% at IPO. Use of funds: ~45% technology/AI, ~25% market entry and commercial, ~15% supply chain and warehouses, ~10% licensing/compliance/security, ~5% working capital.

---

## 13. Milestones & KPIs

**North Star:** repeat purchase rate **and** GMV — the pair that proves both retention and scale.

| Phase | OKR-style targets |
|---|---|
| Phase 0 (Q4 2026) | Incorporate; secure seed; core licences; age/KYC live; 100+ suppliers signed |
| Phase 1 (Q1–Q2 2027) | Launch US/UK/SG; 500k beta users; p95 < 200ms; repeat purchase ≥ 25%; $120M GMV run-rate |
| Phase 2 (Q3–Q4 2027) | Trade/Seller/Flow/Rewards v1; EU five markets; 8M users; $520M GMV |
| Phase 3 (2028) | Apps, Club, Studio v1; 12 languages/10 currencies; 20M users; $1.2B GMV |
| Phase 4 (2029) | Vault, AI API, 24 languages, LatAm; 50M-user trajectory toward $5B GMV Y5 |
| Phase 5 (2030–2034) | 60+ languages; 100M users/60M MAU; $15B GMV; $2.5B revenue; EBITDA positive; IPO readiness |

Supporting KPIs: MAU/registered ratio (target 60% by 2034), take rate, contribution margin, LTV/CAC, 30-day repeat rate, Vault AUM, SaaS ARR, warehouse count, and compliance SLA attainment. **Definitions used by the operating cadence:** repeat purchase rate = share of buyers with ≥2 completed orders in a trailing 12-month window; GMV = gross merchandise value across Market, Trade, and Vault transaction volume; module attachment rate = average number of active modules per user/merchant; NRR = net revenue retention on the SaaS and Club cohorts; contribution = net revenue less payment, fulfilment, compliance, and leakage costs (per the worked example in `02-revenue-model.md`). Each regional general manager owns a weekly North Star review; the CFO owns the take-rate and margin bridge; the Chief Compliance Officer owns a zero-tolerance licensing SLA. OKRs are set annually at the board level and decomposed into quarterly commitments by phase owner.

---

## 14. Exit vision

The primary path is an **initial public offering in the 2032–2035 window**, positioned as the AI-native global alcohol commerce and capital platform with $2.5B revenue, 100M users, and Rule-of-40 economics. A strategic acquisition by a global beverage alcohol major, payment/logistics platform, or general marketplace is a credible secondary path given the proprietary provenance graph and supply-side OS. Both paths depend on the compliance-by-design moat and the compounding data flywheel described above and in `10-investor-pitch-deck.md`.

---

## Appendix A — Assumptions list

1. Global alcohol market ~$1.8T; e-commerce penetration 6–7% (management estimates).
2. Alcohol e-commerce ~$120B; B2B wholesale ~$700B with ~10% digitizable (estimates).
3. Fine wine investment AUM ~$15B; subscription ~$5B; vertical marketing SaaS ~$3B; logistics ~$40B (estimates).
4. Intermediate trajectory years Y4 (2030), Y6 (2032), Y7 (2033) are geometric interpolations of canonical GMV/revenue; Y1/Y2/Y3/Y5/Y8 are canonical.
5. Y8 revenue mix is an estimate consistent with canonical Y5 mix and advertising ≤8% cap.
6. Segment CAC, AOV, frequency, churn, and margin figures are planning estimates, to be validated post-launch.
7. Breakeven (2032) and Round sizes are estimates; canonical launch phases and 2029 Series C are fixed.
8. Warehouse, SKU, producer, user, and load targets are canonical; 3PL/owned split is a strategic assumption.
9. FX/tax treatment and marketplace-facilitator liability to be confirmed per jurisdiction with counsel.
10. All monetization prices, tiers, fees, minimums, and take-rate bands conform exactly to `_canon.md`.
