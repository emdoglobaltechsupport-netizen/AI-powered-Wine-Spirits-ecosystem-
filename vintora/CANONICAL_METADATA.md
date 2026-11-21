# Vintora Canonical Metadata Index

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/canonical-metadata.json`](./config/canonical-metadata.json); checked by `npm run canonical:check`. Values are derived from the sources named below and are not proof that targets are achievable or active.

## 1. Authority chain

[`_canon.md`](./_canon.md) owns the product narrative. [`packages/shared/src/index.ts`](./packages/shared/src/index.ts) owns modules and shared currency/locale types. [`config/jurisdiction-compliance.json`](./config/jurisdiction-compliance.json) owns region scope and active counts. [`config/docs-governance.json`](./config/docs-governance.json) and [`config/test-counts.json`](./config/test-counts.json) own canonical counts. The checker fails when the index drifts from these sources.

## 2. Modules and internal layers

| Field | Value | Source |
|---|---|---|
| Market-facing modules | 10: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards | `CANON.modules` |
| Internal layers | 4: Admin, Global Payments, AI Marketing Automation, Ultimate AI TechOps | `config/docs-governance.json` |
| Admin workspaces | 19 | `config/docs-governance.json` |
| ADM-19 agents | 24, advisory only | `config/docs-governance.json` |

## 3. Regions, currencies and languages

| Field | Value | Status |
|---|---|---|
| Phase-1 design regions | US, UK, SG | Blocked; no activation |
| Africa catalogue targets | 14 `design_target` markets | Blocked; unassigned phase |
| Active countries | 0 | No staging or production activation |
| Prototype currency codes | USD, EUR, GBP, SGD, JPY, AUD, AED, BRL | Indicative demo FX only |
| Currency scale target | 135+ currencies | Unmeasured design target; no active languages or currencies in staging/production |
| Prototype locale codes | en, fr, es | Demo copy only |
| Africa registry languages | en, fr, ar, pt, sw | Candidate registry; no activation |
| Language scale target | 24 launch languages, 60+ by 2030 | Unmeasured design target; 0 active in staging/production |
| RTL target code | ar | Layout target only; no production RTL service |

The 24 target language codes in the machine register are planning identifiers, not translator approvals or locale coverage. No region-to-currency-to-language mapping in this index grants a licence, payment availability or launch permission.

## 4. Counts

| Count | Value | Source |
|---|---:|---|
| Current demo SKU rows | 12 | `config/catalogue-provenance.json` |
| Licensed feeds | 0 | `config/catalogue-provenance.json` |
| Verified catalogue rows | 0 | `config/catalogue-provenance.json` |
| SKU acquisition target | 1,850 | `config/catalogue-provenance.json` |
| Long-term SKU scale target | 10M+ SKU target by 2034 | `config/catalogue-provenance.json` |
| Browser self-test checks | 65 | `config/test-counts.json` |
| Offline assertions | 108 | `config/test-counts.json` |
| Independent Phase 1 checks | 173 | `config/test-counts.json` |

All counts are derived from their registers. Hand-editing a count in documentation fails `npm run test-counts:check`, `npm run claims:check` or `npm run canonical:check`.

## 5. Evidence gaps

No enumerated language inventory, translator review, FX provider contract or jurisdictional activation evidence is attached. Green checks prove source/index parity only.
