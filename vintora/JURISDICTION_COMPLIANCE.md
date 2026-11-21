# Vintora Jurisdictional Compliance Gate

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This register is a release-boundary control, not legal advice and not launch permission.

## Authority

Machine authority: [`config/jurisdiction-compliance.json`](./config/jurisdiction-compliance.json), checked by `npm run jurisdiction:check`. It is fail-closed: `publicLaunch: false`, `liveTransactionsAllowed: false`, no active country/language/currency, no licensing owner, no effective date, no counsel review reference and no launch clearance.

## Scope vocabulary

| Scope class | Meaning | Current entries | Activation state |
|---|---|---:|---|
| `phase1` | Canonical design launch phase (US, UK, Singapore) | 3 | `blocked` |
| `planned` | Sequenced only after a phase gate and evidence | 0 | none |
| `target` | Registry/catalogue domain with no activation approval (Africa Marketplace) | 14 | `blocked` |

Platform totals of 200+ countries, 24 launch languages (60+ by 2030) and 135+ currencies remain **unmeasured design targets**. They are not active coverage. Africa registry languages and currencies are not active in staging or production.

## Regulated activities and control boundary

| Activity | Implementation mode | Live allowed | Law status |
|---|---|---|---|
| Alcohol sale and delivery | `simulated` | No | `unmapped_pending_local_counsel` |
| Age assurance, KYC, AML and sanctions | `simulated` | No | `unmapped_pending_local_counsel` |
| Payments, payouts, FX and Vault settlement | `simulated` | No | `unmapped_pending_local_counsel` |
| Investment, custody and secondary trading | `blueprint_only` | No | `unmapped_pending_securities_advice` |
| Privacy, alcohol advertising and health claims | `simulated` | No | `unmapped_pending_local_counsel` |
| Customs, excise, tax and consumer protection | `simulated` | No | `unmapped_pending_local_counsel` |

No law references, counsel firm, counsel owner, opinion reference or effective date is attached. Licensed-experienced counsel review is required per jurisdiction before any scope class may move from `target`/`phase1` design status to an approved activation state.

## Workflows required before clearance

Each regulated activity defines four mandatory workflows in the register:

1. **Enforcement** — deny the regulated action when jurisdiction or controls are unsatisfied.
2. **Rejection** — plain-language reason plus append-only decision record; no silent fallback.
3. **Appeal** — named human reviewer; no automated reversal.
4. **Record retention** — required, but no schedule is approved in this repository.

## Real and simulated boundary

- Age and KYC providers default to `local`; `REAL_AGE_PROVIDER_OPT_IN` and `REAL_KYC_PROVIDER_OPT_IN` default to `false`.
- `NODE_ENV=production` is rejected at startup.
- Only the `simulated` payment adapter may return `simulated_clear`; every other provider returns `unknown` and blocks checkout.
- Vault has no wallet, custody transfer, real USDC settlement, order or trade. See [`VAULT_LEGAL_BOUNDARIES.md`](./VAULT_LEGAL_BOUNDARIES.md).
- AI campaigns, pricing and publishing remain drafts or simulations; no customer-facing external action is released automatically.

## Launch clearance

`launchClearance.required = true` and `launchClearance.granted = false`. Legal approver, Compliance approver, jurisdiction, effective date, licence evidence, counsel opinions and guard-removal approval are all null/empty. A green `ci:verify` run proves Phase 1 gates only and never grants clearance.
