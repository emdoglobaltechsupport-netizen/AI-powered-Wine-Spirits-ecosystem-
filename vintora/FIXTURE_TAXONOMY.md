# Vintora Test Fixture and Data-Class Taxonomy

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/fixture-taxonomy.json`](./config/fixture-taxonomy.json); checked by `npm run fixtures:check`. This taxonomy labels data by how it may be used; a label is not rights evidence or launch approval.

## 1. Required label

Every fixture, static catalogue row and adapter response carries: `fixtureClass`, `sourceRef`, `sourceLabel`, `freshnessAsOf`, `purchasable` and `externalEffectAllowed`. Static demo rows in [`apps/prototype/data.js`](./apps/prototype/data.js) and API rows in [`catalog.routes.ts`](./services/api/src/modules/catalog/catalog.routes.ts) use `fixtureClass: "demo"`.

## 2. Classes

| Class | Meaning | Present | Purchasable | External effects |
|---|---|---|---|---|
| `demo` | Bundled illustrative product or UI row shown locally | Yes | No | No |
| `mock` | Deterministic adapter response exercising an interface | Yes | No | No |
| `synthetic` | Generated test-only record with reserved `example.invalid` references | Yes | No | No |
| `live` | Real orderable inventory or real provider response with licence and verification evidence | No | No | No |

`live` is reserved. No fixture in this repository may be live, purchasable or capable of an external effect. See [`CATALOGUE_PROVENANCE.md`](./CATALOGUE_PROVENANCE.md) for the separate `seed`/`licensed`/`verified`/`live` catalogue record-class gate.

## 3. Fixture files

[`openfoodfacts.fixture.json`](./packages/db/examples/openfoodfacts.fixture.json) and [`wine-accessories.fixture.json`](./packages/db/examples/wine-accessories.fixture.json) declare `fixtureClass: "synthetic"`, `TEST FIXTURE ONLY` and `example.invalid` references. They are never imported into verified output. Licensed-feed examples are contract templates, not licensed data.

## 4. Checkout boundary

Checkout accepts only the labelled simulation when `CATALOGUE_SOURCE=demo` and `PAYMENT_PROVIDER=simulated`. Quote and simulated-order responses expose `catalogueEligibility` with `simulationOnly: true`, `purchasable: false` and `externalCheckoutBlocked: true`. Any other catalogue source or non-simulated PSP fails closed before safeguards or inventory changes run.

## 5. Evidence gaps

No live fixture, licensed feed record, real provider response or external-effect fixture exists. Mock adapter responses do not evidence provider certification or sandbox connectivity.
