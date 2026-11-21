# VINTORA — Investor Pitch Deck

**Format:** 20-slide Design-state draft + appendix for board review · **Audience:** Board, institutional investors, strategic partners (external use requires the four-eyes review in `CANON_GOVERNANCE.md`)
**Status:** All figures are **modeled projections, targets, and illustrative estimates** — not reported results. No actual users, revenue, supplier contracts, licenses, or partnerships are claimed. Market sizes are estimates requiring primary research before external use. The raise figure is a placeholder set by the board.

---

> ## CANON SNAPSHOT (binding)
>
> - **Brand:** VINTORA ("Vintora" in prose) · *The World's Cellar, Intelligent.* · Founded 2026 (incorporated Q4 2026) · **Dual HQ:** Singapore (APAC/ops) + New York City (Americas/commercial); regional hubs: London, Paris, Amsterdam, Dubai, Tokyo, Sydney, São Paulo, Cape Town.
> - **Mission:** Democratize discovery, trade, and enjoyment of fine wine and spirits worldwide through applied AI — protecting provenance, safety, and responsible consumption.
> - **Ten modules (exact names):** Vintora Market · Vintora Trade · Vintora Sommelier · Vintora Assist · Vintora Studio · Vintora Seller · Vintora Flow · Vintora Club · Vintora Vault · Vintora Rewards.
> - **Canonical trajectory (USD):** 2027 — 2M users / $120M GMV / $18M net revenue / 15.0% take; 2028 — 8M / $520M / $72M / 13.8%; 2029 — 20M / $1.2B / $180M / 15.0%; 2031 — 50M / $5.0B / $750M / 15.0%; 2034 — 100M / $15B / $2.5B / 16.7%. No actual results claimed.
> - **Y5 revenue mix:** B2C 34% · Trade 18% · Club 12% · Seller+Studio 14% · Vault 10% · Logistics 6% · Rewards 3% · Ads/data/API 3% (ads ≤8% of revenue by design).
> - **Pricing canon:** Market 12–20% (luxury 8–12%); Trade 3–8% + $199–$1,499/mo; Club $29/$59/$119/$199 (Good/Better/Best/Icon); Seller Free→$99→$399→$999/mo + 0.5–2%; Studio $199/$599/$2,999/mo + credits; Vault 1.5% buy / 2% sell / 0.5% p.a. custody / 5–15% performance / $25 minimum; Flow cost-plus + 0.3–1.2% insurance.
> - **Scale targets:** 100M registered / 60M MAU · 10M SKU target · 250k producers · 200+ countries · 40+ licensed warehouses · 1.2M orders/day peak · 50k req/sec · p95 <200ms · 99.99% availability · 4.5B embeddings · 300M graph edges.
> - **Roadmap:** Phase 0 Q4 2026 → Phase 1 Q1–Q2 2027 US/UK/SG → Phase 2 Q3–Q4 2027 EU + Trade/Seller/Flow/Rewards → Phase 3 2028 apps/Club/Studio + JP/AE/AU → Phase 4 2029 Vault/API/LatAm/Series C → Phase 5 2030–34 scale/IPO readiness.
> - **Differentiators:** closed-loop AI · provenance graph · supply-side OS · liquidity layer · compliance-by-design.
>
> **Siblings:** [`_canon.md`](./_canon.md) · business plan `01-business-plan.md` · revenue `02-revenue-model.md` · architecture `03-technical-architecture.md` · data `04-database-design.md` · UX `05-ui-ux-wireframes.md` · AI `06-ai-features.md` · marketing `07-marketing-strategy.md` · roadmap `08-launch-roadmap.md` · growth `09-growth-strategy.md`.

---

## SLIDE 1 — Title

**SLIDE TITLE:** VINTORA — *The World's Cellar, Intelligent.*

**On-slide copy**
- AI-native global wine & spirits commerce, content, and capital marketplace.
- One platform. Ten modules. One closed-loop taste graph.
- Founded 2026 · Singapore + New York City.
- **Raise target:** $[TBD]M *(placeholder — board to set)*.
- Confidential — investor discussion. All figures are projections.

**VISUAL direction**
Full-bleed dark aubergine background; a single luminous bottle silhouette dissolving into a constellation of graph nodes. Oversized VINTORA wordmark, warm gold accent, tagline in italic serif. Minimal text; no photography of people.

**SPEAKER NOTES**
Open with the category claim, not the product: beverage alcohol is a $1.8 trillion global market that remains astonishingly analog — fragmented, opaque, hard to navigate, and difficult to trade. Vintora is built to be the intelligent layer on top of it. We are an AI-native company, which means the AI is not a feature appended to a storefront; it is the system that connects discovery, purchase, consumption, and Investment. We are incorporated in 2026 with dual headquarters in Singapore and New York and regional hubs across the world's key wine markets. Today we will walk through the problem, the platform, the economics, the trajectory, and the ask. One discipline throughout: everything numbered is a modeled projection or a target — we do not present projections as results.

---

## SLIDE 2 — The Problem

**SLIDE TITLE:** Wine is a trillion-dollar category running on intuition.

**On-slide copy**
- **Fragmented:** hundreds of thousands of producers; millions of SKUs; no single global system of record.
- **Opaque:** provenance, storage, and condition are unverifiable at point of sale.
- **Hard to navigate:** pairing and taste discovery depend on jargon and gatekeeping.
- **Illiquid:** a cellar is an asset that cannot be valued, financed, or traded.
- **Non-compliant by default:** age, licensing, and shipping rules vary by jurisdiction.
- **Fragmented stack:** discovery, purchase, logistics, and marketing live in different tools.

**VISUAL direction**
Five-column "fragmentation" grid of broken icons — a scattered label, a broken chain, a question mark, a locked cellar, a gavel. Muted greys; one gold thread beginning to connect them, foreshadowing the solution slide.

**SPEAKER NOTES**
The consumer problem is simple: choosing a bottle feels like an exam. The supply problem is harder: a producer or merchant runs listings in one tool, marketing in another, wholesale in a spreadsheet, and logistics through a broker. Nobody has a single operating system. The trust problem is structural: provenance and custody are asserted, not verified, and condition is unknown until the bottle is opened. The capital problem is the biggest overlooked opportunity — fine wine behaves like an asset class, but there is no liquid, custody-backed market with retail access. Finally, compliance is not an afterthought in alcohol; it is the price of entry in every jurisdiction. incumbents solve one slice each. Vivino solves discovery. Wine.com solves US retail. Wine-Searcher solves information. Nobody solves all five.

---

## SLIDE 3 — The Opportunity

**SLIDE TITLE:** A $1.8T market. A <1% beachhead.

**On-slide copy**
- **TAM ≈ $1.8T** global beverage-alcohol retail, including on-trade *(estimate; validate with IWSR/OIV)*.
- **SAM ≈ $240B** de-duplicated, bottom-up across seven module addressable pools *(estimate; see `01-business-plan.md` §2.2)*.
- **SOM = $15B GMV by 2034** = **0.83% of TAM**, **~6.3% of SAM**.
- Implied revenue at 16.7% take: **$2.5B**.
- No incumbent owns discovery + transaction + supply OS + liquidity.

**VISUAL direction**
Three concentric rings labeled TAM / SAM / SOM with the math printed beside each; a small golden wedge inside SOM. Footnote in 8pt: "Estimates for planning; replace with primary research before external use."

**SPEAKER NOTES**
Do the math out loud so the board can audit it. We take an estimated global beverage-alcohol market of roughly $1.8 trillion, retail plus on-trade. We size the serviceable market bottom-up, module by module — roughly $120 billion of wine and spirits e-commerce, $70 billion of digitizable wholesale, $15 billion of fine-wine investment AUM, $5 billion of subscriptions, $11 billion of merchant software and marketing, $12 billion of cross-border and temperature-controlled logistics, and $8 billion of category advertising — de-duplicated to about $240 billion. Our 2034 target of $15 billion in GMV is 0.83% of the total market and roughly 6.3% of the serviceable market. That is deliberately conservative: we do not need to dominate the category to build a very large company. The second point is the important one — the opportunity is not taking share from a single competitor, because no competitor spans the whole stack. We are creating a category position rather than fighting an installed incumbent on its own turf. These market figures are estimates to be replaced with primary research before this deck leaves the room.

---

## SLIDE 4 — Our Solution — One Platform, Ten Modules

**SLIDE TITLE:** One graph. Ten modules. Zero seams.

**On-slide copy**
- **Demand:** Vintora Market · Vintora Sommelier · Vintora Assist · Vintora Club · Vintora Rewards.
- **Supply:** Vintora Seller · Vintora Trade · Vintora Studio · Vintora Flow.
- **Capital:** Vintora Vault.
- Closed loop: taste profile → discovery → purchase → consumption → review → better profile.
- One identity, one wallet, one cellar, one provenance record.

**VISUAL direction**
Three horizontal bands (Demand / Supply / Capital) with ten module tiles; animated gold data thread weaving through all ten into a single node labeled "Taste Graph."

**SPEAKER NOTES**
This is the architecture of the company in one slide. Five modules create and retain demand. Four modules operate supply. One module turns the cellar into capital. The reason they belong in one company is the loop: a consumer tells us what they like, Vintora Sommelier turns that into a recommendation, Vintora Market completes the purchase, consumption and reviews feed back into the profile, and the next recommendation is better. Every iteration makes the consumer experience more relevant and the data asset more valuable. Vintora Assist is the connective tissue — a cross-module concierge that can search, build a cart, arrange gifting, and resolve support in one conversation. A competitor can copy any single tile. Copying the loop requires all ten.

---

## SLIDE 5 — Product Tour

**SLIDE TITLE:** The full stack, module by module.

**On-slide copy**
| Module | Role | Canonical one-liner |
|---|---|---|
| Vintora Market | B2C | Curated consumer storefront, 10M SKU target, age-gated |
| Vintora Trade | B2B | Wholesale/Restaurant/HoReCa procurement, contracts, RFQs |
| Vintora Sommelier | AI | Conversational pairing + tasting + education agent |
| Vintora Assist | AI | Cross-module concierge: search, cart, gifting, support |
| Vintora Studio | AI | Generative content + campaign + audience tools for sellers |
| Vintora Seller | Seller OSS | Listings, inventory, orders, analytics, payouts |
| Vintora Flow | Logistics | Multimodal freight, temperature control, customs, last-mile |
| Vintora Club | Subscription | Curated monthly boxes + tasting experiences |
| Vintora Vault | Investment | Fractional/whole-lot investing, custody, secondary market |
| Vintora Rewards | Loyalty | Unified points, tiers, experiences, partner network |

**VISUAL direction**
Ten-card grid, 5×2, each with a simple line icon and one metric tag (SKUs, RFQs, tiers, currencies). Keep type large enough for a projected screen; speaker notes carry the detail.

**SPEAKER NOTES**
Walk the grid quickly; do not read every cell. Group them. Vintora Market is the age-gated storefront targeting 10M-plus SKUs; Vintora Trade is the wholesale and restaurant procurement layer with RFQs and contracts. Vintora Sommelier and Vintora Assist are the conversational layer — one for expertise, one for action. Vintora Studio and Vintora Seller are the seller's growth and operations stack. Vintora Flow handles multimodal freight, cold chain, customs, and last mile. Vintora Club is the monthly ritual; Vintora Rewards is the unified loyalty currency; Vintora Vault is the capital layer with fractional minimums of $25. Notice that the pricing ladder is embedded in the product design: Seller goes Free to $999 per month, Studio $199 to $2,999, Club $29 to $199. We land free and expand into software, subscription, and capital fees.

---

## SLIDE 6 — The AI Sommelier Moment

**SLIDE TITLE:** "What should I serve with dinner?" — and the answer is yours.

**On-slide copy**
- **Ask:** natural language, voice, WhatsApp, or AR label scan.
- **Understand:** taste profile + occasion + budget + cellar inventory.
- **Answer:** 3 pairings, why they work, provenance snapshot, price, delivery date.
- **Act:** one tap → cart → age gate → Vintora Flow.
- **Learn:** consumption + review → 4.5B-embedding index, 300M-edge knowledge graph.
- 24 launch languages → 60+ by 2030; 135+ currencies; RTL support.

**VISUAL direction**
Four-panel demo narrative: a chat bubble → a preference card → three bottle cards with provenance ribbons → a checkout confirmation. Use a real conversation flow, not a generic chatbot mock.

**SPEAKER NOTES**
This is the moment we want an investor to imagine. A user opens Vintora and asks what to serve with a dinner — perhaps in English, Japanese, or Arabic, by typing, by voice, or by pointing their camera at a bottle on a shelf. Vintora Sommelier does not return a generic list. It uses the user's taste profile, the occasion, budget, and what is already in their cellar, then retrieves over the wine knowledge graph with RAG and returns three pairings with a plain-language rationale, a provenance snapshot, price, and a delivery promise. Vintora Assist completes the transaction, including age verification. After consumption, the review improves the profile. Technically this is a multi-model LLM gateway with self-hosted fine-tuned open-weight models, a two-tower and transformer recommender, and a vector index targeted at 4.5 billion embeddings. Responsible-drinking guardrails are embedded in the prompt and the product — this is not a loophole, it is the design.

---

## SLIDE 7 — Why Now

**SLIDE TITLE:** Four curves finally cross.

**On-slide copy**
- **AI:** frontier models + RAG make expert-level guidance cheap and multilingual.
- **Commerce:** online alcohol adoption and local payments matured globally.
- **Trust:** provenance and authenticity now verifiable with vision + graph.
- **Capital:** fractional assets and stablecoin settlement make cellars tradable.
- **Regulation:** age/KYC/licensing infrastructure is available as a service.
- **Window:** the category incumbent set is digital-adjacent, not AI-native.

**VISUAL direction**
Four upward curves converging into a single bright node labeled "Vintora" in 2030. Clean, minimal, no stock photos.

**SPEAKER NOTES**
Why is this not possible five years earlier, and why not wait five years? Five years ago, language models could not give a reliable, multilingual, source-grounded wine answer at acceptable cost; today a multi-model gateway can route to the right model per query and ground answers in a knowledge graph. Payments and delivery infrastructure for alcohol now exist in most of our target markets — Alipay, WeChat Pay, iDEAL, Klarna, Pix, UPI, SEPA, and more are in our canonical stack. Computer vision makes label OCR, authenticity, and condition grading practical. Fractional ownership and USDC settlement make a cellar investable with a $25 minimum. And compliance tooling has matured enough that age verification, KYC/AML, and jurisdictional licensing can be embedded rather than improvised. The competitive set is strong in slices but not AI-native across the full stack. That convergence is our window.

---

## SLIDE 8 — How It Works — Closed-Loop Flywheel

**SLIDE TITLE:** Every bottle makes the next recommendation better.

**On-slide copy**
```
 TASTE PROFILE ──→ DISCOVERY ──→ PURCHASE ──→ CONSUMPTION
      ↑                                            │
      └──────── REVIEW ←── BETTER PROFILE ←────────┘
```
- Consumer loop: personalization compounds with usage.
- Seller loop: orders → demand signal → better pricing → more supply.
- Liquidity loop: collectors → tighter spreads → more consignors → more lots.
- Graph loop: contributions → better answers → more contributors.
- Data: 300M edges · 4.5B embeddings · audit-ready provenance.

**VISUAL direction**
Large circular arrow diagram with four concentric mini-loops labeled Consumer, Seller, Liquidity, Graph. Gold directional arrows; center node "Closed-loop taste graph."

**SPEAKER NOTES**
The flywheel is the heart of the investment case. The consumer loop is obvious: the more a person uses Vintora Sommelier, the better the profile, the better the recommendation, the more they transact. The seller loop is less visible but equally powerful: more orders produce better demand signals in Vintora Seller, which improve pricing and inventory decisions, which improve merchant margin, which attracts more sellers and deeper catalog. The liquidity loop is the one with the strongest moat: more collectors produce tighter bid-ask spreads and better price discovery in Vintora Vault, which attracts more consignors and more lots, which attracts more collectors. The graph loop converts community contribution into product quality. These loops reinforce each other — a better recommendation produces more orders, which produce more data, which improve the graph, which improves the recommendation. This is why our North Star is repeat purchase rate alongside GMV, not GMV alone.

---

## SLIDE 9 — Business Model & Revenue Mix

**SLIDE TITLE:** Eight revenue lines. One customer relationship.

**On-slide copy**
| Line | Canonical mechanic | Y5 share |
|---|---|---:|
| B2C commission (Vintora Market) | 12–20%; luxury 8–12% | 34% |
| Vintora Trade | 3–8% GMV + $199–$1,499/mo SaaS | 18% |
| Vintora Club | $29/$59/$119/$199 per month | 12% |
| Seller + Studio SaaS | $99–$999/mo; $199–$2,999/mo + credits | 14% |
| Vintora Vault | 1.5% buy / 2% sell / 0.5% p.a. / 5–15% perf. | 10% |
| Vintora Flow | Cost-plus freight + 0.3–1.2% insurance | 6% |
| Vintora Rewards | Interchange, co-branded cards, insights | 3% |
| Ads / data / API | Promoted listings, licenses — capped ≤8% of revenue | 3% |

**VISUAL direction**
Stacked horizontal revenue bar with eight color bands; take-rate callout "15.0% → 16.7% via mix, not price hikes."

**SPEAKER NOTES**
We designed the model to avoid the classic marketplace fragility of a single commission line. At year five, B2C commission is 34% of revenue — important, but not dominant. Trade contributes 18%, subscriptions 12%, SaaS 14%, Vault 10%, logistics 6%, rewards 3%, and ads/data/API 3%. Advertising is deliberately capped at eight percent of revenue by design; we will not buy our revenue with attention. The take rate moves from 15.0% at Y3 and Y5 to 16.7% at Y8, and that expansion comes from mix shift into SaaS, Vault, and Rewards rather than raising consumer commission. Pricing is canonical and testable: fractional minimums of $25 in Vault, Club tiers from $29 to $199, Seller from free to $999, Studio from $199 to $2,999. Land with a free or cheap wedge; expand into recurring software and capital fees.

---

## SLIDE 10 — Traction & Trajectory

**SLIDE TITLE:** The path to 100 million users.

**On-slide copy**
| Year | Users | GMV | Net Revenue | Take Rate |
|---|---:|---:|---:|---:|
| 2027 (Y1) | 2M | $120M | $18M | 15.0% |
| 2028 (Y2) | 8M | $520M | $72M | 13.8% |
| 2029 (Y3) | 20M | $1.2B | $180M | 15.0% |
| 2031 (Y5) | 50M | $5.0B | $750M | 15.0% |
| 2034 (Y8) | 100M | $15B | $2.5B | 16.7% |

**Scale targets:** 60M MAU · 10M SKU target · 250k producers · 200+ countries · 40+ warehouses · 1.2M orders/day peak · 99.99% availability.

**VISUAL direction**
Five-step ascending staircase with year labels; GMV in large numerals, revenue in smaller type. Prominent footnote: "Modeled trajectory — not reported results."

**SPEAKER NOTES**
Be precise here: this is the canonical modeled trajectory, not a statement of achieved traction. The company was incorporated in Q4 2026 and the plan begins with a Phase 1 launch in the US, UK, and Singapore in the first half of 2027. The shape matters more than the individual numbers. We model 2 million users and $120 million of GMV in Y1, 8 million and $520 million in Y2, 20 million and $1.2 billion in Y3, 50 million and $5 billion in Y5, and 100 million users with $15 billion of GMV and $2.5 billion of revenue in Y8. Note the take rate dips to 13.8% in Y2 as we scale the lower-margin B2C mix, then recovers and expands as SaaS, Trade, and Vault mature. Supporting the trajectory are hard scale targets: 60 million monthly actives, 10 million-plus SKUs, 250,000 producers, 200-plus countries, 40-plus licensed warehouses, and a peak of 1.2 million orders per day.

---

## SLIDE 11 — Unit Economics

**SLIDE TITLE:** Healthy contribution at every tier — modeled.

**On-slide copy**
- Blended AOV **$95** → 15% take = **$14.25** revenue per order.
- Variable cost ≈ **$4.78** (payments 2.5%, Flow subsidy, support/returns).
- Contribution ≈ **$9.47/order** — **66%** of net revenue.
- At 4.5 orders/yr: **~$42.6** annual contribution per buyer.
- Target LTV ≈ **$150** · target CAC **≤$40** → **~3.75× LTV/CAC**, payback <12 months.
- Vault adds 1.5/2% transaction fees + 0.5% p.a. custody + performance fees.

**VISUAL direction**
Waterfall chart: GMV → take → payments → fulfillment → support → contribution. Right-hand badge "3.75× LTV/CAC — target."

**SPEAKER NOTES**
All numbers on this slide are modeled and illustrative. Start with a blended average order value of $95. At a 15% take that is $14.25 of net revenue. Variable costs — payment processing at roughly 2.5% of GMV, a logistics subsidy, and support and returns — come to about $4.78, leaving roughly $9.47 of contribution, or 66% of net revenue. At 4.5 orders per year that is about $42.60 of annual contribution per buyer. If we retain a customer long enough to realize roughly $150 of contribution and hold blended CAC at or below $40, we get around 3.75 times LTV to CAC with payback inside twelve months. The model is deliberately conservative about B2C: the real margin expansion is in software, subscriptions, and Vault, where Vault alone adds buy-side and sell-side fees, annual custody, and performance fees above a high-water mark. Detailed sensitivity cases are in `02-revenue-model.md`.

---

## SLIDE 12 — Go-to-Market

**SLIDE TITLE:** Land in five beaches. Expand through the loop.

**On-slide copy**
- **Phase 1:** US · UK · Singapore — Market + Sommelier + Assist; closed beta → launch.
- **Phase 2:** FR · DE · IT · ES · NL — Trade, Seller, Flow, Rewards v1.
- **Phase 3:** JP · AE · AU — apps, Club, Studio v1; 12 languages, 10 currencies.
- **Phase 4:** LatAm — Vault, AI API licensing; 24 languages.
- **Phase 5:** Global — 60+ languages, 200+ countries.
- Growth levers: referrals, gifting, Sommelier share cards, seller invites, partner APIs.
- **North Star:** repeat purchase rate + GMV; five stage gates control capital.

**VISUAL direction**
World map with five sequential waves in gold; inset funnel showing Users × Conversion × Frequency × AOV.

**SPEAKER NOTES**
We sequence geographies by a scored model — market size, wealth fit, licensing ease, supply density, logistics, payments, partners, and whitespace — and require a score of 4.0 out of 5 before launch. US, UK, and Singapore are the first beaches for language, spend, and payments reasons. Europe brings supply density and HoReCa depth, and that is where Trade, Seller, and Flow become essential. Japan, UAE, and Australia add high-value demand; LatAm comes in 2029 with Pix and partner-led entry. Growth itself is not just paid media: shared cellars, gifting, Sommelier share cards, a two-sided referral program with credits and tier unlocks, and seller-to-seller referral create viral loops. Our North Star pairs repeat purchase rate with GMV, and we release capital only when each stage's KPI gates clear. The full growth architecture is in `09-growth-strategy.md`.

---

## SLIDE 13 — Competition & Why We Win

**SLIDE TITLE:** Everyone owns a slice. We own the loop.

**On-slide copy**
| Player | Owns | Missing |
|---|---|---|
| Vivino | Community, ratings | Supply OS, capital layer |
| Wine.com | US retail | Global graph, AI, Vault |
| Wine-Searcher / Vinous | Data, editorial | Transaction, provenance chain |
| WineBid / CultX | Auction liquidity | Daily use, discovery |
| Amazon / Alibaba / JD | Scale, logistics | Curation, provenance, trust |
| Drizly-style | Speed | Cellar, provenance, AOV |
| Liquor boards | Regulatory authority | UX, personalization |
| Brand direct (Gallo, Diageo) | Brand | Multi-brand neutrality |

**VISUAL direction**
2×2 matrix: horizontal = "Information → Full-stack," vertical = "Commodity → Trusted." Vintora alone in the top-right quadrant.

**SPEAKER NOTES**
We respect every competitor in this set; the point is structural, not rhetorical. Vivino owns community and discovery but does not operate supply or capital. Wine.com executes US retail but is not global and has no capital layer. Wine-Searcher and Vinous own information and editorial but not the transaction or the bottle-level custody chain. WineBid and CultX have collectible liquidity but no daily-use case. Amazon and Alibaba have logistics at extraordinary scale but no provenance graph and no curation. Quick commerce wins on speed but has no cellar and low order value. Liquor boards hold regulatory authority but offer poor digital experience. Brand-direct channels are powerful but single-brand. We win by being AI-native in personalization, by operating the supply side, by making provenance auditable, and by adding a liquidity layer. Where the incumbent is strong enough — a distributor, a brand, a regulator — we integrate and sell to them rather than attack.

---

## SLIDE 14 — The Moat

**SLIDE TITLE:** Four assets that compound with every transaction.

**On-slide copy**
- **Data:** closed-loop taste profile — usage makes the model better.
- **Provenance graph:** producer → vineyard → vintage → bottle → custody; 300M edges, audit-ready.
- **Supply OS:** one seller stack across D2C, wholesale, marketing, logistics — switching costs.
- **Liquidity:** Vault order book + custody + provenance; spreads tighten with scale.
- **Compliance layer:** age/KYC/licensing/responsible drinking — a fixed cost entrants avoid.
- 4.5B embeddings · 40+ licensed warehouses · 135+ currencies.

**VISUAL direction**
Four interlocking gear shapes around a central "Trust" core; each gear labeled with one moat and one metric.

**SPEAKER NOTES**
A moat has to get wider as the company grows, not merely bigger. The data moat widens because every interaction improves the taste profile and the recommender. The provenance graph widens because each bottle, vintage, and custody event adds edges — we are targeting 300 million edges, each with an audit trail. The supply OS creates switching costs because a merchant runs listings, wholesale, marketing, and logistics inside Vintora; leaving means unwinding four workflows. The liquidity moat is the deepest: a Vault order book becomes more valuable with every additional collector and consignor, and custody plus provenance is the precondition that makes it trustworthy. Underneath all four sits the compliance layer — age verification, KYC/AML, jurisdictional licensing, and responsible-drinking guardrails. That layer is expensive to build, which is precisely why lightweight entrants cannot follow us into regulated markets.

---

## SLIDE 15 — Technology & Team

**SLIDE TITLE:** Built for 100 million users from day one.

**On-slide copy**
- **Web:** Next.js 15 App Router, TypeScript, RSC, Turborepo · **Mobile:** React Native (Expo), one codebase.
- **Backend:** NestJS BFF, Go microservices, gRPC, Kafka, Istio; Kubernetes EKS+GKE active-active.
- **Data:** PostgreSQL+Citus, TimescaleDB, Redis, OpenSearch, ClickHouse, Neo4j, Delta Lake, Snowflake/dbt.
- **AI:** multi-model LLM gateway, RAG over graph, pgvector/Milvus, two-tower + transformer recs, CV, MLflow/Feast/Ray/Triton.
- **Payments:** Stripe + Adyen, local methods, USDC for Vault, locked-rate FX.
- **Team:** operator-founders across commerce, AI, and beverage-alcohol licensing; named hires to be announced.

**VISUAL direction**
Clean layered architecture stack diagram; badge strip "SOC 2 Type II · ISO 27001 · PCI DSS L1 · 99.99% SLO."

**SPEAKER NOTES**
The architecture is decided, not aspirational: TypeScript across web, mobile, and BFF; Go for high-throughput services; Python for AI and data; Kubernetes multi-region active-active; GraphQL federation for clients with a public REST API for partners and gRPC internally. The data layer includes Neo4j for the knowledge graph, ClickHouse for analytics, a vector store for embeddings, and Snowflake with dbt for the warehouse. AI uses a multi-model gateway — frontier models plus self-hosted fine-tuned open-weight models — with retrieval over the wine knowledge graph, two-tower and transformer recommenders, computer vision for label authenticity and condition, and an MLOps stack of MLflow, Feast, Ray, and Triton. On the team: we are building an operator-led founding team spanning commerce, AI, and alcohol licensing; named appointments will be announced through the proper channels. The technical targets — 50,000 requests per second at the edge, p95 under 200 milliseconds, 99.99% availability — are design constraints, not aspirations.

---

## SLIDE 16 — Regulatory & Trust as an Advantage

**SLIDE TITLE:** The compliance wall is our moat, not our tax.

**On-slide copy**
- Age verification on every surface; 100% gate coverage; ≥99.5% pass rate.
- KYC/AML · USDC settlement for Vault · licensed custody.
- Alcohol licensing per jurisdiction; 40+ licensed warehouses.
- SOC 2 Type II · ISO 27001 · PCI DSS L1 · GDPR/CCPA/LGPD/PIPL.
- Responsible-drinking guardrails embedded in AI prompts and product flows.
- Compliance-by-design: one rule set across all ten modules.

**VISUAL direction**
Shield motif with five locked layers (Age · Identity · License · Custody · Conduct); gold checkmarks. No legal-small-print wall.

**SPEAKER NOTES**
Most companies treat regulation as a cost center to be minimized. We treat it as a competitive advantage. Alcohol is regulated differently in every jurisdiction, and the unglamorous work of age verification, licensing, KYC/AML, and responsible-drinking guardrails is exactly what keeps casual entrants out. We embed one compliance rule set across all ten modules, so a transaction in Singapore and a wholesale contract in France inherit the same controls. Our security posture targets SOC 2 Type II, ISO 27001, and PCI DSS Level 1, and we design for GDPR, CCPA, LGPD, and PIPL. Vault adds licensed custody, KYC/AML, and USDC settlement. If a regulatory shock hits a jurisdiction, we can freeze marketing in 24 hours, complete legal review in 72, and reroute supply within 30 days through our hub and warehouse network. Trust is what lets a brand, a regulator, and a board take a 100-million-user platform seriously.

---

## SLIDE 17 — Growth Roadmap

**SLIDE TITLE:** Six phases. One compounding machine.

**On-slide copy**
| Phase | When | What ships | Where |
|---|---|---|---|
| 0 | Q4 2026 | Foundation, licensing, age/KYC, seed, suppliers | SG + NYC |
| 1 | Q1–Q2 2027 | Market + Sommelier + Assist (beta → launch) | US, UK, SG |
| 2 | Q3–Q4 2027 | Trade, Seller, Flow, Rewards v1 | FR, DE, IT, ES, NL |
| 3 | 2028 | Apps, Club, Studio v1; 12 languages, 10 currencies | JP, AE, AU |
| 4 | 2029 | Vault, AI API licensing, 24 languages, Series C | LatAm |
| 5 | 2030–34 | Global scale, 60+ languages, profitability, IPO readiness | 200+ countries |

**VISUAL direction**
Horizontal six-gantt strip with module icons appearing at each phase; final phase marked "IPO readiness."

**SPEAKER NOTES**
Phase 0 is Q4 2026: foundation, licensing, age and KYC, founder team, seed capital, and supplier signing. Phase 1 is a closed beta and launch of Vintora Market, Vintora Sommelier, and Vintora Assist in the US, UK, and Singapore. Phase 2 adds Vintora Trade, Seller, Flow, and Rewards v1 across Europe. Phase 3 brings native iOS and Android apps, Vintora Club, Studio v1, 12 languages, and 10 currencies, plus Japan, UAE, and Australia. Phase 4 launches Vintora Vault, AI API licensing, and LatAm at 24 languages, aligned with a Series C. Phase 5 runs from 2030 to 2034: global scale, 60-plus languages, profitability, and IPO readiness. Each phase has explicit KPI gates — conversion, repeat purchase rate, delivery SLA, take rate, and compliance — and capital is released only when those gates clear. Detailed hiring, capital, and risk plans live in `08-launch-roadmap.md`.

---

## SLIDE 18 — The Ask & Use of Funds

**SLIDE TITLE:** Fund the binding constraint. Earn the next stage.

**On-slide copy**
- **Raise:** $[TBD]M *(placeholder — board to set)*.
- **~40%** Product, AI, platform & SLO engineering.
- **~25%** Supply, licensing & warehouse partnerships.
- **~20%** Go-to-market, localization & country launch.
- **~15%** Reserve for compliance, M&A & working capital.
- Milestone-linked tranches: 2M users / $120M GMV → 8M / $520M → 20M / $1.2B.

**VISUAL direction**
Four-block allocation bar beside a three-step milestone ladder; large "$[TBD]M" placeholder.

**SPEAKER NOTES**
The raise amount is intentionally a placeholder — the board sets it once the final capital plan is approved. What we can show today is the allocation logic. Roughly forty percent goes into product, AI, and the platform engineering needed to hold 99.99% availability at 50,000 requests per second. About twenty-five percent goes into supply, licensing, and warehouse partnerships, which is the binding constraint in the early stages. About twenty percent funds go-to-market, localization, and country launches. Fifteen percent is reserved for compliance, tuck-in acquisitions, and working capital. We prefer milestone-linked deployment: capital for the next stage unlocks when the prior stage's KPI gates are met — 2 million users and $120 million of GMV, then 8 million and $520 million, then 20 million and $1.2 billion. That structure aligns the downside: if the retention loop does not work, we stop buying users and fix the product before spending more.

---

## SLIDE 19 — Financial Outlook & Returns

**SLIDE TITLE:** $2.5B revenue at 16.7% take — modeled.

**On-slide copy**
- **Y5:** 50M users · $5.0B GMV · $750M revenue · 15.0% take.
- **Y8:** 100M users · $15B GMV · $2.5B revenue · **16.7% take**.
- Revenue mix at Y5: B2C 34% · Trade 18% · Club 12% · SaaS 14% · Vault 10% · Flow 6% · Rewards 3% · Ads/data/API 3%.
- No single line >40%; advertising capped at ≤8% of revenue.
- Target contribution margin 58% → 68%; profitability targeted in Phase 5.
- Returns framing to be completed with validated cap table and entry valuation.

**VISUAL direction**
Two-axis chart: GMV bars rising to $15B, take-rate line rising to 16.7%; right panel donut of Y5 revenue mix.

**SPEAKER NOTES**
The financial model is transparent. By Y5 we target 50 million users, $5 billion of GMV, $750 million of revenue at a 15% take. By Y8 we target 100 million users, $15 billion of GMV, and $2.5 billion of revenue at a 16.7% take. The revenue mix at Y5 is deliberately diversified: B2C commission 34%, Trade 18%, Club 12%, Seller and Studio SaaS 14%, Vault 10%, logistics 6%, Rewards 3%, and ads/data/API 3%. No single line exceeds 40%, and advertising is capped at eight percent of revenue by design. Modeled contribution margin improves from 58% to 68% on mix and logistics efficiency. Profitability is a Phase 5 target. We are not presenting an IRR or MOIC in this deck because that requires a validated cap table and entry valuation; those will be provided in the data room. What we are presenting is an auditable driver model: users, conversion, frequency, average order value, and take rate.

---

## SLIDE 20 — Vision / Closing

**SLIDE TITLE:** The world's cellar, intelligent.

**On-slide copy**
- Vintora becomes the **Cellar OS** — the system of record for what the world owns, wants, trades, and drinks.
- **100M users · 60M MAU · 200+ countries · 300M-edge provenance graph.**
- Eight revenue lines. One closed loop. One trusted identity.
- Not a marketplace. The operating system for a category.

**VISUAL direction**
Return to the Slide 1 bottle silhouette, now resolved into a living global network of cellars; tagline in gold serif. Single line of contact detail beneath.

**SPEAKER NOTES**
Close on the category, not the feature list. Vintora's ambition is to become the Cellar OS — the system of record for what a person or a business owns, wants, trades, and drinks. When that is true, the company is not a wine shop competing on price; it is infrastructure for consumers, producers, restaurants, collectors, and capital. The end-state numbers are 100 million registered users, 60 million monthly actives, more than 200 countries, and a 300-million-edge provenance graph that no competitor can replicate. Eight revenue lines sit on one customer relationship and one closed loop. The tagline says it best: The World's Cellar, Intelligent. We invite the board to fund the binding constraint, hold us to the KPI gates, and build this category with us.

---

# APPENDIX

## APPENDIX A1 — Market Data Sources

**On-slide copy**
- Global alcohol market estimates: IWSR Drinks Market Analysis, OIV, Statista, company filings.
- Category benchmarks: online alcohol penetration, HoReCa procurement spend, fine-wine auction volumes.
- Regulatory data: jurisdictional alcohol regulators, licensing registries, age-verification standards.
- Competitor data: public filings, app-store estimates, published product pricing.
- **Status:** TAM/SAM/SOM figures in Slide 3 are planning estimates; replace with primary research before external distribution.

**SPEAKER NOTES**
Every market number in this deck is labeled as an estimate. Before this deck is used externally, replace the TAM and SAM with licensed primary research — IWSR and OIV are the natural sources for global beverage-alcohol volume and value, and national regulators for jurisdiction-level rules. Competitor figures should come from public filings or published pricing, not anecdote. Keep a source log next to every number; the board should be able to trace any claim to a document and a date.

## APPENDIX A2 — Definitions

**On-slide copy**
- **GMV:** gross merchandise value, net of cancellations, returns, and fraud.
- **Net revenue:** GMV × take rate plus non-GMV lines (SaaS, custody, interchange, logistics).
- **Take rate:** net revenue ÷ GMV.
- **RPR:** repeat purchase rate — buyers with ≥2 orders in trailing 12 months ÷ buyers.
- **MAU:** monthly active users; **AOV:** average order value.
- **OTIF:** on-time, in-full delivery; **AUM:** assets under management/custody in Vault.
- **High-water mark:** benchmark above which Vault performance fees apply.

**SPEAKER NOTES**
These definitions are binding across the deck and across the documentation suite so that no slide silently changes a metric. In particular, GMV is always net of cancellations, returns, and fraud, and take rate is always net revenue divided by GMV. RPR is the North Star and is measured on a trailing twelve-month basis against age-verified buyers. Where a line of revenue is not tied to GMV — SaaS subscriptions, custody fees, interchange — we say so explicitly. See `02-revenue-model.md` for the full metric dictionary.

## APPENDIX A3 — Detailed Financials

**On-slide copy**
| Year | Users | GMV | Revenue | Take | Implied revenue/user |
|---|---:|---:|---:|---:|---:|
| 2027 | 2M | $120M | $18M | 15.0% | $9 |
| 2028 | 8M | $520M | $72M | 13.8% | $9 |
| 2029 | 20M | $1.2B | $180M | 15.0% | $9 |
| 2031 | 50M | $5.0B | $750M | 15.0% | $15 |
| 2034 | 100M | $15B | $2.5B | 16.7% | $25 |

**On-slide copy (continued)**
- Y5 mix dollars: B2C $255M · Trade $135M · Club $90M · SaaS $105M · Vault $75M · Flow $45M · Rewards $22.5M · Ads/data/API $22.5M.
- Modeled decomposition: 100M users × 18% buyers × 4.5 orders × $185 AOV ≈ $15B GMV.
- All figures modeled; see `02-revenue-model.md` for sensitivity cases.

**SPEAKER NOTES**
This appendix gives the board the arithmetic behind Slide 10 and Slide 19. Implied revenue per registered user rises from $9 in the early years to $25 at Y8 — the expansion ladder, not price increases. At Y5 the mix translates into B2C $255 million, Trade $135 million, Club $90 million, SaaS $105 million, Vault $75 million, Flow $45 million, Rewards $22.5 million, and ads/data/API $22.5 million, summing to $750 million. The Y8 GMV bridge is 100 million users times an 18% buyer conversion, 4.5 orders per buyer, and a $185 average order value, which gives approximately $15 billion. Every one of these inputs is a target with a dedicated growth lever and an owning module in `09-growth-strategy.md`.

## APPENDIX A4 — Glossary

**On-slide copy**
- **AI Sommelier:** Vintora Sommelier — conversational pairing, tasting, and education agent.
- **Assist:** Vintora Assist — cross-module concierge for search, cart, gifting, support.
- **Studio:** Vintora Studio — generative marketing suite for sellers and brands.
- **Seller:** Vintora Seller — merchant operating system.
- **Flow:** Vintora Flow — multimodal logistics, cold chain, customs, last mile.
- **Club / Rewards / Vault:** subscription, loyalty, and investment modules respectively.
- **Closed loop:** taste profile → discovery → purchase → consumption → review → better profile.
- **Cellar OS:** Vintora's long-term category position as system of record for wine and spirits.

**SPEAKER NOTES**
Use the canonical module names exactly — "Vintora Sommelier," not "the chatbot," and "Vintora Vault," not "the investment thing." Consistency matters in a diligence process: an investor who hears three names for one module starts to question the operating discipline. The glossary, the canon file, and the other nine documents in this suite all use the same vocabulary. If a term is not here, check `_canon.md`, which is the single source of truth for names, numbers, module names, and trajectory.

---

*VINTORA — The World's Cellar, Intelligent.* · All figures are modeled projections, targets, and illustrative estimates — not reported results.
