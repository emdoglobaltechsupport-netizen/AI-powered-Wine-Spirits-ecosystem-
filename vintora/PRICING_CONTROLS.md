# Vintora Dynamic Pricing Controls

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Pricing is a design-state recommendation engine. No listing price, promotion or personalized offer is applied automatically.

## Authority

Machine authority: [`config/pricing-controls.json`](./config/pricing-controls.json), checked by `npm run pricing:check`. Shared evaluator: [`packages/shared/src/pricing-controls.ts`](./packages/shared/src/pricing-controls.ts). The `pricing-promotions` high-risk record remains blocked and unsigned.

## Permitted variables

`verified_unit_cost`, `verified_provenance_grade`, `verified_stock_and_custody_state`, `published_list_price`, `fixed_public_promotion_calendar`, `jurisdiction_tax_and_eligibility_rules`, `fulfilment_cost_and_insurance`.

Jurisdiction is used only for tax and eligibility rules, never for inferred willingness to pay. Every input must be registered, documented and reproducible from the explanation hash.

## Excluded variables

`protected_class_or_proxy`, `age_except_legal_eligibility`, `health_or_recovery_profile`, `inferred_demographic_segment`, `browsing_or_purchase_history_without_opt_in`, `postcode_or_neighbourhood_willingness_to_pay`, `device_or_browser_type`, `unlicensed_competitor_price`, `competitor_identity_for_coordination`.

Personalized pricing is disabled. Competitor inputs require a licensed, aggregated index; scraping, competitor targeting and price signalling are prohibited.

## Hard constraints

| Constraint | Value |
|---|---:|
| Minimum gross margin | 12% |
| Maximum published increase | 10% |
| Maximum discount | 15% |
| Minimum days between public changes | 30 |
| Maximum changes per SKU per quarter | 2 |
| Same SKU, same published price | Required |
| Hidden fees | Prohibited |
| Public effective date | Required |

The evaluator denies any proposal outside these bands. A passing result is still only an `allowed_recommendation`; `executionAuthorized` is always false.

## Human approval, explainability and audit

A named seller must approve listing-price changes and Finance must approve platform promotions. The approver must be distinct from the actor, supply an 8+ character reason and act within an unexpired window. Self-approval is denied. Every recommendation records `ruleVersion`, `inputs`, `marginBeforePct`, `marginAfterPct`, `changePct`, `reasons`, `evidenceRefs` and the append-only audit fields listed in the register, including `explanationHash`.

## Competition, consumer-pricing and disparity reviews

No competition-law or consumer-pricing counsel opinion is attached. No measured geographic or demographic disparity result is attached. Alcohol-promotion review is also outstanding. Geographic review, demographic review and a protected-proxy scan are required before publication; evidence reference, reviewer and review date are null and `publishBlockedUntilReview` is true. The checker verifies the registered blockers, not empirical fairness.

## Verification and boundaries

`npm run pricing:check` verifies policy/shared-code/docs parity and blocked high-risk state. `npm run test:shared` exercises prohibited inputs, margin/change bands, personalized pricing, automated application, approval rule violations, missing explanations and missing disparity evidence. A green result proves configuration parity only; it is not competition-law advice, a fairness measurement, launch clearance or permission to publish a price.
