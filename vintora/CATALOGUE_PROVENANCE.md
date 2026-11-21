# Vintora Catalogue Provenance — Demo Versus Verified

> **Prototype mode — no real orders are placed. NO-GO for public launch.**

The API currently serves **demo catalogue data only**. The machine-readable authority is [`config/catalogue-provenance.json`](./config/catalogue-provenance.json), checked by `npm run catalogue:provenance:check`.

## Demo source

- Source: `packages/db/seed/001_seed.sql`, 12 bundled demonstration products.
- API label: `dataClass: "demo"`, `sourceClass: "seed"`, `sourceRef: "packages/db/seed/001_seed.sql"`, `freshnessAsOf` and `sourceLabel: "Demo catalogue — not verified inventory or licensed supplier stock."`
- `GET /v1/products` includes `catalogueSource`; every product includes the same source fields plus `purchasable: false`, `verifiedAt: null` and `licenceEvidence: null`.
- The static fallback in `apps/prototype/data.js` carries the same seed labels. The UI shows "Seed demo record … not licensed or verified · not purchasable" on cards, product detail and the cart.
- Demo rows are illustrative. They are not licensed stock, supplier attestations, verified prices, barcodes, awards or image rights.

## Quantity claims and freshness

| Claim class | Figure | Source | Freshness | Coverage / uniqueness |
|---|---:|---|---|---|
| **Current demo** | 12 SKU rows | `packages/db/seed/001_seed.sql` | Prototype snapshot, no live feed | 12 unique demo SKU codes; 0 licensed-source rows; 0 verified rows |
| **Acquisition target** | 1,850 records | `packages/db/config/catalogue-taxonomy.json` | Coverage goal, not populated inventory | Per-category targets only; no records are fabricated to close the gap |
| **Long-term scale target** | 10M+ SKU target by 2034 | `_canon.md`, `config/market-forecasts.json` | Unmeasured design target | No current, licensed or live catalogue count supports this figure |

`npm run catalogue:provenance:check` derives the current count from the seed SQL, verifies that 1,850 equals the catalogue taxonomy target, and rejects any register that drops the "target" label from the 10M+ scale claim.

## Verified source boundary

- The verified staging boundary is `catalogue_import_verified` in `packages/db/sql/catalogue_import.sql`.
- `packages/db/scripts/catalogue-import.mjs` excludes `fixture` sources unless `--include-fixtures` is explicitly supplied and applies `--min-confidence 0.7` by default.
- A verified import requires stable rights/licence evidence and a separately enabled adapter. The prototype does not enable it.
- `CATALOGUE_SOURCE=verified` does **not** switch data sources in this build: catalogue routes reject it with `400 invalid_request` and `Verified catalogue adapter is not enabled in the prototype`.

## Source-class isolation

| Class | Meaning | Present? | Purchasable? |
|---|---|---|---|
| `seed` | Bundled demo/reference row from the prototype seed or static fallback | Yes, 12 rows | No |
| `licensed` | Row backed by rights evidence or a licensed supplier feed | No | No |
| `verified` | Row passing the verified-import adapter and confidence gate | No | No |
| `live` | Real, orderable inventory with live payment and fulfilment | No | No |

`purchasableClasses` is empty. Checkout accepts only the labelled simulation when `CATALOGUE_SOURCE=demo` **and** `PAYMENT_PROVIDER=simulated`; a non-simulated PSP or any other catalogue source is rejected with `403 forbidden` before safeguards or inventory changes run. Quote and simulated-order responses include `catalogueEligibility` with `sourceClass: "seed"`, `purchasable: false`, `externalCheckoutBlocked: true` and `simulationOnly: true`.

## Fail-closed rules

1. No silent substitution of demo rows for verified inventory.
2. No fixture or low-confidence row may be promoted into verified output by default.
3. No public launch may occur while `publicLaunchRequiresVerified` is true and the verified adapter is absent.
4. Smoke checks assert the demo/seed labels on list, detail, quote and simulated-order responses.
5. Browser selftests assert that every static row has provenance metadata and that cards, detail and cart expose the simulation-only boundary.
6. No seed, licensed or verified row may enter a live checkout path; only `live` rows could be purchasable after separate evidence exists.

This is a provenance boundary, not supplier rights evidence. No licensed feed, brand authorisation or verified catalogue artifact is committed.
