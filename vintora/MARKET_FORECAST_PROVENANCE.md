# Vintora Market Forecast Provenance

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.** Every figure below is a management estimate, projection, design target or design cap. None is a reported result, valuation, guarantee or verified market observation.

## Canon snapshot

| Fact | Value |
|---|---|
| Tagline | *The World's Cellar, Intelligent.* |
| Market-facing modules | Exactly ten: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards |
| Internal layers | Admin Panel, Global Payments, AI Marketing Automation, Ultimate AI TechOps (not market-facing modules) |
| Canonical financial trajectory | 2027–2034 users/GMV/net revenue (management projection) |
| Canonical scale targets | 100M users, 10M SKU target, 200+ countries, 1.2M orders/day peak, p95 < 200 ms, 99.99% availability |
| Advertising ceiling | ≤ 8% of revenue by design |

---

## 1. Provenance policy

1. **All figures in this documentation suite are management estimates or projections.** They exist to express intent, scale assumptions and unit economics — not to describe observed performance.
2. **No primary-source citations are currently attached.** No figure in this document, `_canon.md`, `01-business-plan.md`, `02-revenue-model.md`, `10-investor-pitch-deck.md` or any module document has a verified URL, report title, publication date, page reference or dataset identifier attached.
3. **Source families below are candidates only.** Naming IWSR, OIV, Statista, company filings or regulator data identifies where evidence *could* be obtained. It is **not** a citation and must not be presented as one.
4. **No fabricated artifacts.** Do not invent URLs, dates, report titles, ISBNs, barcodes, prices, ratings, awards, licences, customer counts or named endorsements. Demo catalogue values in the prototype are illustrative and are not market evidence.
5. **Machine-readable register is authoritative for validation.** [`config/market-forecasts.json`](./config/market-forecasts.json) holds the forecast records with `id`, `metric`, `value`, `unit`, `horizon`, `sourceClass`, `sources[]`, `sourceStatus`, `confidence`, `evidenceRef`, `owner`, `refreshCadence` and `notes`. `npm run forecasts:check` validates the register. A prose change to a figure without a matching config change fails review.
6. **Regulated claims require separate sign-off.** Any figure used in public, investor or advertising material must pass the Canon Steward and Compliance/Legal reviewer process in [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) and the high-risk gate in [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) where applicable.

---

## 2. Confidence scale

| Level | Evidence criteria required | Permitted language |
|---|---|---|
| **Low** | Management estimate with no attached primary source, or a design target with no completed test. `sourceStatus` is `uncited`, `internal-estimate` or `target`. | "estimate", "projection", "target", "design cap", "planned" — never "according to", "verified", "reported". |
| **Medium** | At least one named, retrievable primary source with an evidence reference and a recorded method/date; internal cross-check completed; owner confirmed. | "sourced estimate", "based on", with the reference shown. |
| **High** | Multiple independent primary sources or a completed internal measurement (for example a passed load drill), with method, date, evidence reference and reviewer sign-off. | "measured", "verified", "audited" only when the underlying record exists. |

**Current register confidence: Low for every record.** No record meets the Medium criteria because no evidence reference has been attached and no independent verification has been recorded.

---

## 3. Canonical forecast register

`id` values mirror the `id` field in `config/market-forecasts.json`; the config file is authoritative if a value differs. All rows: **Confidence = Low**, **Evidence status = uncited / internal estimate / target — no primary source attached**.

| id | Metric | Value (canonical) | Source class | Candidate source families (not cited) | Owner role | Refresh trigger |
|---|---|---|---|---|---|---|
| `market-global-alcohol-size` | Global alcohol market size | ~$1.8T | Management market estimate | IWSR, OIV, Statista, company filings | Canon Steward (founder/product lead) | New industry dataset; quarterly canon review |
| `market-ecommerce-penetration` | Alcohol e-commerce penetration | 6–7% | Management market estimate | IWSR, OIV, Statista, regulator data | CMO / Growth lead | New channel-share dataset; Phase gate review |
| `market-fine-wine-aum` | Fine-wine investment AUM | ~$15B | Management market estimate | Company filings, industry analyst datasets, regulator/financial-promotion data | Vault / Investment Product lead + Finance lead | Custody or securities-regulation change; annual review |
| `financial-2027` | Users / GMV / net revenue | 2M / $120M / $18M | Management projection | Internal operating plan; comparable company filings | Canon Steward + CFO / Finance lead | Quarterly actuals vs plan; any canon update |
| `financial-2028` | Users / GMV / net revenue | 8M / $520M / $72M | Management projection | Internal operating plan; comparable company filings | Canon Steward + CFO / Finance lead | Quarterly actuals vs plan; any canon update |
| `financial-2029` | Users / GMV / net revenue | 20M / $1.2B / $180M | Management projection | Internal operating plan; comparable company filings | Canon Steward + CFO / Finance lead | Quarterly actuals vs plan; any canon update |
| `financial-2031` | Users / GMV / net revenue | 50M / $5.0B / $750M | Management projection | Internal operating plan; comparable company filings | Canon Steward + CFO / Finance lead | Quarterly actuals vs plan; any canon update |
| `financial-2034` | Users / GMV / net revenue | 100M / $15B / $2.5B | Management projection | Internal operating plan; comparable company filings | Canon Steward + CFO / Finance lead | Quarterly actuals vs plan; any canon update |
| `scale-users` | Registered users target | 100M by 2034 | Internal design target | Internal capacity plan; completed load test (none yet) | CTO / Architecture Review Board | Load test / DR drill; capacity model revision |
| `scale-skus` | Catalogue size target | 10M SKU target | Internal design target | Internal supply plan; supplier feed inventory (not bundled) | Catalogue / Data lead | Verified feed onboarding; supply plan change |
| `scale-countries` | Countries served target | 200+ | Internal design target | Internal market registry; local counsel confirmations | Canon Steward + Compliance/Legal reviewer | Any country activation or registry change |
| `scale-orders-per-day` | Peak order throughput | 1.2M orders/day | Internal design target | Completed load test (none yet); internal capacity model | CTO / Architecture Review Board | Load test result; architecture change |
| `scale-api-p95` | API latency target | p95 < 200 ms | Internal design target | Completed load test and SLO report (none yet) | CTO / Architecture Review Board | Load test result; SLO review |
| `scale-availability` | Availability target | 99.99% | Internal design target | Completed DR/failover drill (none yet); SLO report | CTO / Architecture Review Board | DR drill; SLO review |
| `spend-advertising-cap` | Advertising spend ceiling | ≤ 8% of revenue | Design cap / governance rule | Internal budget and filings; no external claim | CMO / Growth lead + Finance lead | Budget cycle; campaign approval; any cap change |
| `africa-expansion` | Africa Marketplace expansion scope | 14-market expansion inside Vintora Market | Internal market registry / design target | Regulator data, local counsel confirmations, internal registry | Global Beverage Marketplace Strategist + Compliance/Legal reviewer | Any country activation gate change; legal update |

---

## 4. Register contract and checks

| Field | Requirement |
|---|---|
| `id` | Stable slug; referenced by docs and ADRs; never reused for a different metric. |
| `metric`, `value`, `unit`, `horizon` | Must match the canonical wording, units and time horizon in `_canon.md`. |
| `sourceClass` | Use the values declared by `config/market-forecasts.json`; expected classes are management estimate, projection, internal target, design cap and registry scope. |
| `sources[]` | Candidate source families only while no evidence is attached; never a fabricated URL or title. |
| `sourceStatus` | Use the values declared by the config (expected: uncited, internal estimate, target, sourced, verified). Moving to `sourced`/`verified` requires a real `evidenceRef`. |
| `confidence` | `Low`, `Medium` or `High` using the criteria in §2, matching the config field. |
| `evidenceRef` | Empty/null until evidence exists; then a real internal or primary-source reference. |
| `owner`, `refreshCadence`, `notes` | Role-based owner (no individual names); trigger and caveats recorded. |

Run `npm run forecasts:check` before every release and in CI. The check enforces the register contract (complete records, valid status/confidence values and evidence rules); any failure blocks the release until the config and this document agree.

---

## 5. Authoring rules for all documents

| Rule | Application |
|---|---|
| Label before quoting | Write "management projection", "design target", "design cap" or "illustrative demo value" next to the first use of a figure. |
| No citation theatre | Do not add a footnote, link or "Source:" line unless a real artifact exists and is recorded in `evidenceRef`. |
| No live-traction language | Do not say "we serve", "our users", "verified sales", "real AUM" or "measured uptime" in this phase. |
| No invented commercial artifacts | Barcodes, prices, ratings, reviews, awards, supplier names and imagery in the prototype are demo data; do not promote them to evidence. |
| Same-PR sync | Update `_canon.md`, this document and `config/market-forecasts.json` together; then run `npm run forecasts:check` and `npm run ci:verify`. |

---

## 6. Refresh workflow and current gaps

1. Owner detects a trigger in §3 and opens a canon change request per [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md).
2. Impact assessment covers all ten modules, canon tests, API contracts, docs, UI copy and legal claims.
3. Four-eyes approval: Canon Steward plus a distinct approver; Compliance/Legal reviewer for regulated or public claims.
4. Update canon, derived docs and config in one PR; attach the evidence reference if the confidence level changes.
5. Run `npm run forecasts:check`, `npm run test:shared` and `npm run ci:verify`. Record an ADR for architectural impacts and a migration note for user-visible changes.

**Current gaps:** every record is Low confidence and uncited; no evidence references exist; no refresh has been performed; no external verification has been requested. Until those gaps close, figures must not be presented as market research or as the company's observed results.

---

## 7. Governance references

- [`_canon.md`](./_canon.md) — single source of truth for names and numbers.
- [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) — change control and approvals.
- [`DISCLAIMER.md`](./DISCLAIMER.md), [`FEATURE_STATUS.md`](./FEATURE_STATUS.md), [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) — maturity and NO-GO boundary.
- [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) and [`config/high-risk-features.json`](./config/high-risk-features.json) with `npm run gates:check` — high-risk activation gate.
- [`adr/`](./adr/README.md) — architecture decisions; [`SECURITY.md`](./SECURITY.md) with `npm run secrets:scan` — no secrets in evidence artifacts.
