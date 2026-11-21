# Vintora Vault — Legal and Settlement Boundaries

> **Prototype mode — no real orders are placed. NO-GO.** Vault is a **non-live blueprint**, not an investment product, brokerage, custody service or settlement rail.

## Authority

Machine authority: [`config/vault-boundaries.json`](./config/vault-boundaries.json), checked by `npm run jurisdiction:check`. `status` is `non_live_blueprint`; `prototypeLiveOrdersAllowed`, `realUsdcSettlementAllowed` and `userFundsOrAssetsHeld` are all `false`.

## Separated concerns

| Concern | Prototype boundary | Future requirement |
|---|---|---|
| Ownership / title | No title model or transfer is live; legal holder of whole lots and fractional interests is undefined. | Jurisdiction-specific securities/commodities and title opinion defining the entity that holds title and beneficial interests. |
| Custody | No custodian, warrant, warehouse receipt, key custody or omnibus wallet. | Independent licensed custodian, segregation, insurance evidence and reconciliation. |
| Trading | Order book and matching are design artefacts only. | Regulated venue/structure advice, market rules, suitability, disclosures and audit. |
| Settlement | **No real USDC settlement** in local, test, staging or prototype UI; no wallet or on/off-ramp. | Licensed settlement partner, AML/sanctions controls, tested reconciliation and legal approval. |
| Investment advice / forecasts | Ranges and scores with confidence; never target prices, yield, returns or performance guarantees. | Licensed advice structure where required, suitability and risk disclosures. |

## Required legal reviews

All reviews in the register are `not_obtained` with null owner, jurisdiction and evidence:

- securities and commodities advice;
- title and fractional-interest opinion;
- custody licence review;
- AML/sanctions/tax review;
- consumer-protection and marketing review.

## Required controls and disclosures

Controls: licensed custodian; segregated title and assets; independent reconciliation; KYC/AML/sanctions; suitability and risk disclosure; non-performance disclaimer; no real USDC in prototype; dual approval and append-only audit.

Disclosures: capital at risk; forecasts are not guarantees; fractional-interest classification and tax treatment are unresolved; prototype mode places no real orders.

## Enforcement

`npm run jurisdiction:check` fails if the register permits live orders, real USDC settlement or held funds/assets, if a legal review gains evidence without approval, if the README/Vault documents drop the non-live or no-real-USDC boundary, or if prototype UI advertises live USDC settlement. This gate is a blocker, not launch approval.
