# VINTORA — Revenue Model & Monetization Architecture

> *The World's Cellar, Intelligent.*

---

## Canon snapshot (binding source of truth)

| Item | Canonical fact |
|---|---|
| **Brand / tagline** | VINTORA (prose: "Vintora") · *The World's Cellar, Intelligent.* |
| **Mission** | Democratize discovery, trade, and enjoyment of fine wine and spirits worldwide through applied AI — protecting provenance, safety, and responsible consumption. |
| **Founded / HQ** | 2026 (Q4) · Dual HQ Singapore + New York City |
| **10 modules** | Vintora Market, Vintora Trade, Vintora Sommelier, Vintora Assist, Vintora Studio, Vintora Seller, Vintora Flow, Vintora Club, Vintora Vault, Vintora Rewards |
| **Y1 2027** | 2M users · $120M GMV · $18M net revenue · 15.0% take rate |
| **Y2 2028** | 8M users · $520M GMV · $72M net revenue · 13.8% take rate |
| **Y3 2029** | 20M users · $1.2B GMV · $180M net revenue · 15.0% take rate |
| **Y5 2031** | 50M users · $5.0B GMV · $750M net revenue · 15.0% take rate |
| **Y8 2034** | 100M users · $15B GMV · $2.5B net revenue · 16.7% take rate |
| **Y5 revenue mix** | B2C 34% · Trade 18% · Club 12% · Seller+Studio 14% · Vault 10% · Logistics 6% · Rewards 3% · Ads/data/API 3% |

All prices, fees, tiers, bands, and percentages below conform exactly to `_canon.md`. Unlabelled figures that extend the canonical table (interpolated years, unit-economics estimates, sensitivities) are marked "estimate." Companion detail: `03-technical-architecture.md`, `04-database-design.md`, `05-ui-ux-wireframes.md`, `06-ai-features.md`, `07-marketing-strategy.md`, `08-launch-roadmap.md`, `09-growth-strategy.md`, `10-investor-pitch-deck.md`.

---

## 1. Revenue philosophy

**Take-rate discipline.** Vintora earns a fee for creating liquidity, trust, and efficiency — never for markups disguised as convenience. B2C GMV commission is **12–20% tiered by category**, with **premium/luxury at 8–12%** to stay competitive on high-ticket bottles where buyers are price-sensitive and substitution risk is high. B2B Trade carries a deliberately lower **3–8% GMV** because wholesale margins are thin and volume is the prize; the yield gap is recovered through SaaS and financing. Advertising is capped at **≤8% of revenue by design**, protecting user trust and preventing the marketplace from degrading into an auction for attention.

**Recurring vs transactional mix.** At Y5, recurring and quasi-recurring lines — Club (12%), Seller+Studio SaaS (14%), Vault custody/fees (10%), Rewards (3%) — total ~39% of revenue, with ads/data/API (3%) adding high-margin, low-capital income. Transactional GMV commission (B2C 34% + Trade 18% = 52%) still dominates, but the mix shifts toward recurring by Y8 (estimate: SaaS 18%, Vault 12%, Club 13%), which is the mechanical driver of blended take-rate expansion from 15.0% to 16.7%.

**Land-and-expand.** A relationship begins with one module and expands: a consumer enters via Vintora Market, adopts Vintora Sommelier and Vintora Assist, subscribes to Vintora Club, joins Vintora Rewards, and eventually invests through Vintora Vault. A producer begins on Vintora Seller (free), upgrades to paid tiers, adopts Vintora Studio for marketing, sells wholesale through Vintora Trade, ships via Vintora Flow, and co-markets to the Club base. Expansion is measured by **module attachment rate** and **net revenue retention (NRR)**, both targeted above 120% by Y5 (estimate).

---

## 2. Full monetization matrix (all 10 modules)

| Module (canonical name) | Charge trigger | Pricing (canonical) | Payer | Frequency | Gross margin expectation (estimate) |
|---|---|---|---|---|---|
| **Vintora Market** | Completed B2C order | 12–20% GMV commission by category; premium/luxury 8–12% | Seller / merchant funded from order | Per transaction | 80–85% |
| **Vintora Trade** | Wholesale order + subscription + credit draw | 3–8% GMV; SaaS $199–$1,499/mo; financing/credit spread | Trade buyer / seller (shared) | Per order + monthly | 78–85% |
| **Vintora Sommelier** | Embedded in conversion; AI API licensing at scale | Indirect (conversion lift); API usage pricing in Phase 4 | Consumers (indirect), enterprise API customers | Continuous / per API call | 70–85% on licensed API |
| **Vintora Assist** | Assisted cart/gift/support resolution | Indirect (AOV lift, support-cost avoidance); no standalone consumer fee | Platform economics | Continuous | n/a direct; 100% indirect |
| **Vintora Studio** | Subscription + generation usage | $199 / $599 / $2,999 per month (Creator/Brand/Enterprise) + usage credits | Sellers, brands | Monthly + usage | ~82% |
| **Vintora Seller** | Subscription + processed payments | Free → $99 → $399 → $999/mo; 0.5–2% payment processing | Merchants | Monthly + per transaction | 85% SaaS; 40–60% on processing spread |
| **Vintora Flow** | Shipment, storage, insurance policy | Cost-plus freight; last-mile; insurance 0.3–1.2% of insured value; bonded warehousing | Merchants, trade, consumers (shipper-pays default) | Per shipment / per month storage | 20–35% cost-plus; 60–70% insurance |
| **Vintora Club** | Monthly subscription renewal | $29 / $59 / $119 / $199 per month (Good/Better/Best/Icon) | Subscribers | Monthly | 40–50% |
| **Vintora Vault** | Trade execution, custody, performance | 1.5% buy-side + 2% sell-side; 0.5% p.a. custody; 5–15% performance fee above high-water mark; fractional minimum $25 | Investors | Per trade + annually + on performance | 85–95% |
| **Vintora Rewards** | Partner interchange, card spend, insight licence | Partner interchange; co-branded cards; anonymized privacy-safe insights | Partners, issuers | Ongoing | 70–90% |

**Design notes.** Vintora Assist and Vintora Sommelier are deliberately not meter-charged to consumers; their return is realized as higher conversion, larger baskets, lower support cost, and — from Phase 4 — third-party AI API licensing. Vintora Studio usage credits prevent generative cost from eroding the ~82% subscription margin. Vintora Flow's low cost-plus margin is intentional: it is a trust and reliability layer, not a profit centre, and its insurance attach is the margin kicker.

---

## 3. Take-rate math & worked examples

### 3.1 What "take rate" means at Vintora

Blended take rate = **Net Revenue ÷ GMV**. It is not a single commission; it is the net result of ten monetization lines, some of which (SaaS, Club, Vault, ads) generate revenue outside the GMV denominator. That is why the canonical take rate moves 15.0% (Y1) → 13.8% (Y2, GMV-heavy launch mix) → 15.0% (Y3) → 15.0% (Y5) → 16.7% (Y8): as recurring, fee-based lines compound faster than GMV, net revenue grows faster than GMV and the blended rate expands.

A useful internal decomposition (Y5 estimate): transactional take = ~11.3% of GMV (B2C commission + Trade commission + Flow spread), non-GMV revenue = ~3.7% of GMV equivalent (SaaS, Club, Vault, Rewards, ads), summing to the canonical 15.0%.

### 3.2 Worked example — a $120 bottle order on Vintora Market

Assumptions: blended B2C commission 15% (within the 12–20% band), card processing 2.4% + $0.30 (estimate), Flow net fulfilment cost after buyer shipping contribution $5.00 (estimate), age/compliance levy $0.40 (estimate), leakage reserve 1.2% of GMV (estimate).

| Line | Calculation | Amount |
|---|---|---|
| Order GMV | — | $120.00 |
| Vintora commission (net revenue) | 15% × $120 | **+$18.00** |
| Payment processing | 2.4% × $120 + $0.30 | −$3.18 |
| Age/KYC compliance levy | flat | −$0.40 |
| **Gross profit on net revenue** | $18.00 − $3.18 − $0.40 | **$14.42 (80.1% GM)** |
| Flow fulfilment (net of shipping charged to buyer) | estimate | −$5.00 |
| Fraud/refund/chargeback reserve | 1.2% × $120 | −$1.44 |
| **Contribution before CAC** | $14.42 − $5.00 − $1.44 | **$7.98** |
| Contribution as % of GMV | $7.98 / $120 | **6.7%** |
| Contribution as % of net revenue | $7.98 / $18.00 | **44.3%** |
| Allocated first-order CAC (B2C blended, estimate) | — | −$28.00 |
| **First-order contribution after CAC** | — | **−$20.02** |

**Interpretation:** the first order is CAC-accretive-negative by design — the model is won on repeat purchase, not the first bottle. With a ~45% contribution margin and 4.2 orders/year at $145 AOV (estimates), the B2C customer repays CAC in roughly 8 months and generates ~$230 contribution LTV (8.2x LTV/CAC). A premium/luxury order at the 8–12% commission band produces lower absolute take but higher AOV and lower price sensitivity; a repeat customer on a $400 bottle at 10% yields $40 net revenue with materially better contribution dollars.

### 3.3 Worked example — B2B Trade order

A restaurant places a $4,000 wholesale order at 5% commission with a $599/mo Trade SaaS subscription (estimate): GMV commission $200 + monthly SaaS $599. Trade contribution margin ~60% → ~$120 from the order plus ~$359 from SaaS in that month. The low GMV take is offset by predictable SaaS and by financing spread on credit terms.

---

## 4. Pricing tiers

### 4.1 Vintora Seller

| Tier | Price | Core entitlement |
|---|---|---|
| Free | $0/mo | Basic listing, limited SKUs, standard payouts |
| Growth | $99/mo | Expanded listings, basic analytics, email support |
| Pro | $399/mo | Inventory sync, advanced analytics, Vintora Studio entry |
| Enterprise | $999/mo | API access, multi-entity, priority support, custom reporting |
| Payment processing | 0.5–2% of processed volume | Tier-dependent rate |

### 4.2 Vintora Studio

| Tier | Price | Core entitlement |
|---|---|---|
| Creator | $199/mo | Generative copy/imagery basics, limited credits |
| Brand | $599/mo | Campaign builder, audience tools, higher credit pool |
| Enterprise | $2,999/mo | Full suite, brand takeovers, dedicated success, custom models |
| Usage credits | Variable | Metered generative overage protecting ~82% gross margin |

### 4.3 Vintora Club

| Tier | Price / month | Positioning |
|---|---|---|
| Good | $29 | Entry curation, core box |
| Better | $59 | Expanded selection, tasting notes |
| Best | $119 | Premium bottles, experiences |
| Icon | $199 | Luxury allocation, exclusive events |

### 4.4 Vintora Trade (SaaS bands)

| Tier | Price / month | Core entitlement |
|---|---|---|
| Starter | $199 | RFQ access, basic procurement |
| Pro | $599 | Contracts, credit terms, analytics |
| Enterprise | $1,499 | Multi-location, API/ERP integration, dedicated account team |
| Plus | 3–8% of GMV | Wholesale transaction commission (band, canonical) |
| Plus | Financing/credit spread | Canonical: "financing/credit" |

### 4.5 Vintora Vault fee schedule

| Fee | Rate | Trigger |
|---|---|---|
| Buy-side | 1.5% | On purchase execution |
| Sell-side | 2% | On secondary sale |
| Custody | 0.5% p.a. | On assets under custody |
| Performance | 5–15% | Above high-water mark |
| Fractional minimum | $25 | Entry investment |

---

## 5. Unit economics model (estimates at scale)

| Segment | CAC | Net revenue driver | Contribution margin | Contribution / period | LTV (contribution) | LTV/CAC | Payback |
|---|---|---|---|---|---|---|---|
| B2C Market | $28 | $21.75/order (15% × $145 AOV) | 45% | $9.79/order | ~$230 | 8.2x | ~8 mo |
| B2B Trade | $3,500/account | $8,400/yr (5% × $48k GMV + $6k SaaS) | 60% | $5,040/yr | ~$30,000 | 8.6x | ~8 mo |
| Vintora Vault | $600 | $700/yr on ~$28k AUM (blended 2.5% yield incl. performance) | 70% | $490/yr | ~$4,900 | 8.2x | ~15 mo |
| Vintora Club | $35 | $79/mo blended ARPU | 45% | $35.55/mo | ~$700 | 20x | ~1 mo |
| Seller + Studio SaaS | $1,800 | $280/mo blended ARPA | 80% | $224/mo | ~$11,200 | 6.2x | ~8 mo |
| Vintora Flow | attached | Cost-plus spread + insurance attach | 20–35% + 60–70% insurance | variable | n/a (service line) | n/a | immediate |

**Contribution per order by line (estimate):** B2C $9.79 (45% of $21.75 net revenue); B2B $120 on a $4,000 order plus SaaS; Vault $10.50 on a $700 buy (1.5% of ~$700 positioned lot) with 85–95% fee margin; Club $35.55/month on blended ARPU; SaaS $224/month on blended ARPA. Blended contribution margin on net revenue expands from ~48% (Y1) to ~60% (Y8) as SaaS, Vault, and ads scale (estimate).

---

## 6. Revenue waterfall Y1 → Y8

Canonical years (Y1, Y2, Y3, Y5, Y8) are marked **C**; interpolated years (Y4, Y6, Y7) are **E**.

| Year | Users | GMV | Net Revenue | Take Rate | Source |
|---|---|---|---|---|---|
| 2027 Y1 | 2M | $120M | $18M | 15.0% | C |
| 2028 Y2 | 8M | $520M | $72M | 13.8% | C |
| 2029 Y3 | 20M | $1.2B | $180M | 15.0% | C |
| 2030 Y4 | ~32M | ~$2.5B | ~$370M | ~14.8% | E |
| 2031 Y5 | 50M | $5.0B | $750M | 15.0% | C |
| 2032 Y6 | ~68M | ~$7.2B | ~$1.12B | ~15.6% | E |
| 2033 Y7 | ~85M | ~$10.4B | ~$1.67B | ~16.1% | E |
| 2034 Y8 | 100M | $15B | $2.5B | 16.7% | C |

GMV grows 125x from Y1 to Y8; net revenue grows 139x — the excess is take-rate expansion.

### 6.1 Revenue mix at Y5 (canonical) and Y8 (estimate)

| Line | Y5 % (C) | Y5 $ (on $750M) | Y8 % (E) | Y8 $ (on $2.5B) |
|---|---|---|---|---|
| B2C commission | 34% | $255M | 28% | $700M |
| B2B Trade | 18% | $135M | 20% | $500M |
| Subscriptions/Club | 12% | $90M | 13% | $325M |
| Seller+Studio SaaS | 14% | $105M | 18% | $450M |
| Vault fees | 10% | $75M | 12% | $300M |
| Logistics | 6% | $45M | 5% | $125M |
| Rewards/partnerships | 3% | $22.5M | 2% | $50M |
| Ads/data/API | 3% | $22.5M | 2% | $50M |
| **Total** | **100%** | **$750M** | **100%** | **$2.5B** |

Advertising remains at or below the canonical 8% cap (3% Y5, 2% Y8 estimate).

---

## 7. Ancillary revenues

- **Advertising** — promoted listings, sponsored content, brand takeovers; capped ≤8% of revenue by design; ~80%+ gross margin (estimate).
- **Privacy-safe data insights** — anonymized, aggregated demand signals to producers and trade buyers; no personal data leaves the platform (GDPR/CCPA/PIPL-safe).
- **AI API licensing** — Phase 4 (2029): external access to Vintora Sommelier/Assist models and knowledge-graph queries, priced per call; ~70–85% margin.
- **Financing** — Vintora Trade credit and inventory financing spread; Vault-linked lending against custodied cellar assets (subject to licensing).
- **Insurance** — Flow shipment/cargo insurance at 0.3–1.2% of insured value; product-liability attach.
- **Events** — Club tastings, producer dinners, Vault collector events; ticket and partner revenue.
- **Gifting & corporate gifting** — Assist-driven gifting flows and B2B corporate programmes; higher AOV, lower price sensitivity.
- **White-label** — Seller/Studio/Flow infrastructure licensed to retailers and distributors under their own brand; SaaS-margin revenue.

---

## 8. FX, cross-border & tax considerations

- **FX:** 135+ currencies; locked-rate FX engine at checkout; natural hedge from multi-currency inflows/outflows; USDC settlement for Vintora Vault per canon. FX spread is a small ancillary margin, not a profit centre.
- **VAT/GST & duty:** cross-border orders are priced with deterministic tax determination by jurisdiction; bonded warehousing defers excise/duty until release to consumption, improving working capital.
- **Excise:** alcohol excise is jurisdiction-specific and embedded in landed cost; Vintora Trade B2B invoices carry excise where applicable.
- **Marketplace facilitator liability:** where Vintora is deemed the facilitator, it collects and remits sales/use/VAT; the tax engine and compliance function own registration and filing per jurisdiction.
- **Reporting:** 1099-K-style seller reporting in the US and equivalent EU/APAC regimes; Vintora Seller payouts carry compliant tax documentation.
- **Transfer pricing:** Singapore (APAC/ops) and New York (Americas/commercial) dual-HQ structure requires intercompany transfer-pricing policy and documentation.

---

## 9. Fraud / refund / chargeback leakage model

Leakage is modelled as a percentage of GMV and reserved at order recognition (estimate):

| Leakage source | Rate (% GMV) | Mitigation |
|---|---|---|
| Card chargebacks | 0.35% | 3DS2, AVS, velocity rules, anomaly detection |
| Counterfeit/condition disputes | 0.30% | Provenance graph, label OCR, condition grading, seller indemnity |
| Damaged-in-transit claims | 0.35% | Condition photography, Flow telemetry, insurance claim |
| Refunds/returns abuse | 0.20% | Return policy enforcement, buyer scoring |
| **Total leakage reserve** | **~1.2%** | Reserved in contribution (see $120 example) |

At $15B Y8 GMV, a 1.2% leakage rate equals ~$180M of reserved cost; reducing it to 0.8% through better grading and anomaly detection releases ~$60M of annual contribution — a concrete AI-driven margin lever (`06-ai-features.md`).

---

## 10. Investor framing

**Path to $2.5B revenue.** Net revenue compounds from $18M (Y1) to $2.5B (Y8) on 125x GMV growth plus take-rate expansion from 15.0% to 16.7%. The engine is multi-layered: B2C commission provides scale ($700M at Y8 estimate), SaaS and Vault provide margin and recurrence ($750M combined at Y8 estimate), and Club/Trade/Rewards/ads diversify the base. No single line exceeds 28% of Y8 revenue (estimate) — resilience is structural.

**Enterprise value logic.** A conservative floor values Vintora at **1.0x Y8 revenue = $2.5B+ enterprise value**. Applying mature marketplace/SaaS hybrid multiples of 6–10x forward revenue (estimate, dependent on growth and FCF at the time) implies a $15B–$25B EV range in the IPO window. The premium rests on four defensible assets: the 300M-edge wine knowledge graph, 4.5B-embedding vector index, provenance/custody layer, and supply-side OS with 250k producers.

**Rule-of-40 trajectory (estimates):**

| Year | Revenue growth | EBITDA margin | Rule of 40 |
|---|---|---|---|
| Y1 | n/a | −120% | n/a |
| Y2 | +300% | −80% | 220 |
| Y3 | +150% | −45% | 105 |
| Y4 | +106% | −25% | 81 |
| Y5 | +103% | −10% | 93 |
| Y6 | +49% | +2% | 51 |
| Y7 | +49% | +12% | 61 |
| Y8 | +50% | +20% | 70 |

Rule of 40 exceeds 40 from Y2 onward and remains above it through the IPO window, strengthening as EBITDA turns positive in Y6 (2032). See `10-investor-pitch-deck.md`.

---

## 11. Sensitivity analysis — Y8 (2034, estimates)

| Scenario | GMV | Take rate | Net revenue | Contribution margin | Contribution $ |
|---|---|---|---|---|---|
| **Bear** | $10B | 14.0% | $1.4B | 50% | $700M |
| **Base** | $15B | 16.7% | $2.5B | 60% | $1.5B |
| **Bull** | $19B | 18.0% | $3.42B | 65% | $2.22B |

Base case is the canonical trajectory. Bear represents slower user monetization and GMV-heavy mix (take rate reverts toward the Y2 low). Bull represents faster SaaS/Vault/API adoption and international scale. Enterprise value scales roughly linearly with net revenue at a given multiple: bear ~$1.4B floor at 1x, base $2.5B floor, bull $3.42B floor — with multiple expansion the dominant upside variable.

---

## Appendix — modelling assumptions

1. Canonical numbers (trajectory, mix, all prices/fees/tiers/bands, launch phases) are taken verbatim from `_canon.md` and never overridden.
2. Y4/Y6/Y7 are geometric interpolations of canonical GMV and revenue; Y8 mix and all Rule-of-40 margins are estimates.
3. Segment CAC, AOV, frequency, churn, ARPU/ARPA, and margin figures are planning estimates for diligence validation.
4. Payment cost of 2.4% + $0.30, fulfilment $5.00, compliance levy $0.40, and 1.2% leakage reserve are illustrative estimates for the $120 worked example only.
5. Gross-margin expectations by module are estimates derived from software (80–85%), marketplace (80–85%), subscription (40–50%), cost-plus logistics (20–35%), and asset-fee (85–95%) comparables.
6. Advertising is held at or below the canonical ≤8% of revenue cap in every scenario.
7. USDC Vault settlement, 135+ currencies, and locked-rate FX are canonical; specific tax/facilitator outcomes require per-jurisdiction counsel.
