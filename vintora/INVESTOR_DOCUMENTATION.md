# Vintora Investor Documentation Index — Design Targets Only

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This document is **not investor-ready** evidence. It separates planning narrative from onboarding in [`README.md`](./README.md) and regulatory controls in [`REGULATORY_DOCUMENTATION.md`](./REGULATORY_DOCUMENTATION.md). Every figure below is a projection, estimate, target or unmeasured Design-state assumption.

## Owner and review

| Item | Value |
|---|---|
| Owner role | Founder / Finance Lead |
| Review cadence | Quarterly external review; four-eyes canon and forecast review before any external use |
| Canonical versions | canon `1.0`, policies `v1`, API `v1` |
| Status | Design targets only; no reported performance, contracts, licences or approvals |
| Change control | [`CLAIMS_CHANGE_MANAGEMENT.md`](./CLAIMS_CHANGE_MANAGEMENT.md) and [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) |

## Source documents

- [`10 — Pitch Deck`](./10-investor-pitch-deck.md) — narrative draft requiring review before external use.
- [`01 — Business Plan`](./01-business-plan.md), [`02 — Revenue Model`](./02-revenue-model.md) and [`08 — Launch Roadmap`](./08-launch-roadmap.md) — Design-state planning inputs.
- [`FINANCIAL_ASSUMPTIONS.md`](./FINANCIAL_ASSUMPTIONS.md) and [`config/financial-assumptions.json`](./config/financial-assumptions.json) — dated assumptions, definitions, owners, source status, confidence and ranges.
- [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md) and [`config/market-forecasts.json`](./config/market-forecasts.json) — uncited or clearly sourced estimates with evidence gaps.
- [`config/implementation-status.json`](./config/implementation-status.json) and [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) — what is Design, Prototype, Pilot or Production; no component is in Pilot or Production.

## Reading guide

- **Investor / board member:** These are **Design**-state planning artifacts and **not investor-ready** evidence. Start with [10 — Pitch Deck](./10-investor-pitch-deck.md), then [01 — Business Plan](./01-business-plan.md) and [02 — Revenue Model](./02-revenue-model.md); any external use requires the four-eyes review in [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) §§4 and 8.
- **Engineer / architect:** Read [_canon.md](./_canon.md) → [03 — Architecture](./03-technical-architecture.md) → [04 — Database Design](./04-database-design.md) → [06 — AI Features](./06-ai-features.md) → [`BUILDING.md`](./BUILDING.md).
- **Designer / product manager:** [05 — UI/UX Wireframes](./05-ui-ux-wireframes.md) → [06 — AI Features](./06-ai-features.md) → [08 — Roadmap](./08-launch-roadmap.md).
- **Marketer / growth lead:** [07 — Marketing Strategy](./07-marketing-strategy.md) → [09 — Growth Strategy](./09-growth-strategy.md) → [10 — Pitch Deck](./10-investor-pitch-deck.md).
- **Operator / supply chain:** [01 — Business Plan](./01-business-plan.md) → [08 — Launch Roadmap](./08-launch-roadmap.md) → [02 — Revenue Model](./02-revenue-model.md).

## Executive snapshot — Design targets, not reported results

**Canonical design profile:** 2026 · Dual HQ: Singapore + New York · Category: AI-native beverage-alcohol commerce, content and capital marketplace (Design target).

**Mission (Design intent):** Democratize the discovery, trade, and enjoyment of fine wine and spirits worldwide through applied AI — with provenance, safety, and responsible consumption built into the target design.

## Modeled projections — not actual performance

| Year | Users | GMV | Net Revenue |
|---|---:|---:|---:|
| 2027 | 2M | $120M | $18M |
| 2028 | 8M | $520M | $72M |
| 2029 | 20M | $1.2B | $180M |
| 2031 | 50M | $5.0B | $750M |
| 2034 | 100M | $15B | $2.5B |

**Scale target (unmeasured):** 100M registered users, `10M+ SKU target by 2034`, 200+ countries, 1.2M orders/day peak, 99.99% availability and p95 API < 200 ms. These are targets, not current capacity, inventory or measurements. See [`config/capacity-model.json`](./config/capacity-model.json) and [`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md).

**Current catalogue boundary:** 12 demo SKU rows, 0 licensed feeds, 0 verified rows. The 1,850-record acquisition goal and the `10M+ SKU target by 2034` are unmeasured design targets. See [`CATALOGUE_PROVENANCE.md`](./CATALOGUE_PROVENANCE.md).

## Design differentiators to be evidenced, not live capabilities

1. Closed-loop AI — taste profile → discovery → purchase → consumption → review → better profile.
2. Provenance graph — producer → vineyard → vintage → bottle → custody chain as an audit-oriented model.
3. Supply-side OS — one seller stack for D2C, wholesale, marketing and logistics.
4. Liquidity layer — the cellar as a proposed investable, tradable asset class.
5. Compliance-by-design — age, KYC, licensing and responsible drinking specified across the design.

## Important note on numbers

All figures are modeled projections, targets and illustrative estimates for planning and narrative purposes — not reported results. No actual users, revenue, supplier contracts, licences or partnerships are claimed. Market sizes are labelled estimates and should be replaced with primary research before external use. Valuation ranges, where present, are illustrative targets, not offers. A documentation-only change cannot promote a target into a result.
