# ADR-0004 — Vault Custody, Title and Secondary Market Claims

## Status

**Accepted for prototype scope.** Vintora Vault is an interactive simulation with demo rows only; no custodian, no title, no fractional ownership and no exchange or broker activity exists. **Blocked** for any real feature: licensed custody, segregation, legal opinions, investor protections and jurisdictional approvals are required. See [`../DISCLAIMER.md`](../DISCLAIMER.md) and [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md).

---

## Context

- Vintora Vault is one of the ten locked market-facing modules. The canon describes fine-wine investment, custody and a secondary market as a **Phase 4 (2029) roadmap item**. That roadmap is a projection, not a shipped capability.
- The database includes schema-only Vault domain tables (for example investments, lots, vault_holdings, trades and custody_events) with `tenant_id`/`user_id` RLS. Rows are demo values; no asset, bottle, warehouse receipt or cash balance exists.
- Canonical revenue design mentions buy-side/sell-side fees, custody fees, performance fees above a high-water mark and a $25 fractional minimum. These are **projections** and must never be presented as live pricing, actual custody service or an offer to invest.
- The canonical stack mentions USDC settlement and a target of 40+ licensed warehouses. No wallet, key custody, custodian agreement, warehouse warrant or settlement rail is implemented.
- Alcohol, securities, commodity, tax, AML and cross-border rules vary by jurisdiction. No legal opinion, licence or registrant status is bundled.
- Guardrails relevant here: no real orders or money, no autonomous AI action, human approval before publish, append-only audit, four-eyes, and clear separation from the payment layer in [`./ADR-0002-payments.md`](./ADR-0002-payments.md).

### Canon snapshot

VINTORA — *The World's Cellar, Intelligent.* Ten market-facing modules only. Prototype mode — no real orders are placed; Vault is a simulation with no real assets or money. All financial figures are projections. NO-GO for production.

---

## Decision

### 1. Vault is simulation only

- The prototype may display demo lots, holdings, custody-event timelines, simulated prices and a simulated secondary-market interaction. Every such surface must be labelled as simulated/demo and derived from bundled fixture data.
- No real bottle, lot, warehouse space, insurance policy, title document or custody receipt is acquired, held or transferred.
- No user may create a real investment position, deposit funds, withdraw funds, or receive a payout through Vault. No wallet or private key exists.
- No returns, yield, performance fee, valuation or liquidity claim is made as fact; any figure is a projection or demo value.

### 2. No fractional title and no ownership claim

- The prototype must not issue, represent, transfer or record fractional legal title, beneficial ownership, security interests, tokens, warrants or certificates.
- Terms such as "own", "shares", "security", "token", "guaranteed", "insured return" or "liquidity" may appear only in clearly labelled demo/roadmap copy or internal design documents, never as an assertion about a live product.
- Schema names like `vault_holdings`, `trades` or `custody_events` are design placeholders. They are not a register of interests and confer no rights.

### 3. No exchange, broker-dealer, ATS or fiduciary claims

- No order book, matching engine, market maker, broker, dealer, exchange, ATS, investment adviser or fiduciary functionality is implemented or implied.
- Simulated "trades" are deterministic UI/state transitions in the demo, not executed transactions. No best-execution, settlement, clearing, custody or investor-protection obligation is assumed to be met.
- Sommelier and Assist must not give investment advice; Vault questions route to simulation copy and a disclaimer, consistent with [`./ADR-0003-ai.md`](./ADR-0003-ai.md).

### 4. Required before any real Vault feature

A real feature cannot be enabled until **all** of the following are obtained and evidenced:

1. A licensed custodian agreement with defined bailment, segregation, insurance, audit and insolvency-remoteness terms.
2. Jurisdiction-specific legal opinions covering securities/commodity regulation, fractional interests, tax, cross-border transfer, alcohol ownership and secondary trading.
3. Registrations or licences for any exchange, broker-dealer, ATS, marketplace or investment activity in each enabled jurisdiction.
4. Investor suitability, KYC/AML, accreditation where required, disclosure documents, risk warnings, complaints handling and a fiduciary/conflict policy.
5. A written valuation policy, condition grading, provenance verification and evidence chain for every lot; no fixture data in a live catalogue.
6. Segregated client accounts and a settlement model reviewed under [`../FINANCIAL_CONTROLS.md`](../FINANCIAL_CONTROLS.md): ledger postings, reconciliation, payout controls and dispute handling.
7. A reviewed fee schedule with high-water-mark calculations, custody fees and any performance fee; all figures independently auditable.
8. Data protection, retention and privacy review for investor records, plus role-based access and append-only audit for custody events.
9. Human approval, four-eyes and time-boxed break-glass for any valuation change, fee change, release or exceptional transfer.
10. Executive, Legal, Compliance and Finance go/no-go sign-off recorded in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md).

### 5. Technology boundaries

- Vault tables inherit `tenant_id`/`user_id` RLS from the database decision in [`./ADR-0001-database.md`](./ADR-0001-database.md). No cross-tenant holding or custody event may be read.
- All Vault mutations are guarded, reason-bearing and append-only audited where the Admin domain supports it; general API audit remains a stdout baseline.
- Payment adapter calls from Vault are forbidden in prototype mode; any future settlement path must be a separately approved adapter, not a reuse of demo checkout.
- The kill switch and agent restrictions in [`./ADR-0003-ai.md`](./ADR-0003-ai.md) and [`./ADR-0005-agent-boundaries.md`](./ADR-0005-agent-boundaries.md) apply to any AI-assisted Vault surface.

---

## Consequences

### Positive

- No customer can be misled into believing a simulated holding is a real asset or regulated investment.
- The company avoids incurring custody, securities, commodities or fiduciary obligations before licences and controls exist.
- Schema and UI work can proceed as architecture review material without creating legal exposure.
- Clear routing of investment questions protects Sommelier/Assist from unlicensed-advice risk.
- The explicit required-evidence list gives Legal and Compliance a concrete gate rather than an open-ended "later".

### Negative

- The Vault module is non-functional as an investment product in the prototype; demos must be framed as concept simulation.
- Deferred legal opinions and custodian negotiation may delay or prevent the Phase 4 roadmap entirely; that roadmap is not a commitment.
- Building compliant custody, valuation and secondary-trading controls would be expensive and is not funded by this scaffold.
- Simulated prices/fees can still be misquoted if a demo is shown without its disclaimer; presentation discipline is required.
- Reusing schema names for a future real product risks conceptual drift; documentation must keep the placeholder distinction explicit.

---

## Alternatives considered

| Alternative | Why not adopted |
|---|---|
| Launch with a partner custodian in prototype mode | No licence, agreement, segregation evidence or legal opinion; would create real obligations. |
| Tokenize lots and settle in USDC now | No wallet/key custody, no registration analysis, no AML controls; high regulatory and security risk. |
| Rebrand Vault as a non-investment cellar club | Would contradict the locked module name/canon and still risk sales claims; requires canon change and legal review. |
| Permit fractional title with internal records only | An internal register of interests can still be an unregistered security/commodity interest; rejected. |
| Delay all Vault-related code and docs | The scaffold benefits from schema and boundary design now, provided it stays clearly simulated. |
| Allow AI to suggest trades or valuations | Would be investment advice/automated action by a system with no approval or suitability controls. |

---

## Compliance/guardrail implications

- **Age/KYC/licence before order:** no Vault order exists; if a regulated activity is ever added, the same synchronous gate applies before any transaction.
- **Human approval before publish:** Vault copy, pricing displays and any future valuation change require human approval.
- **No autonomous publishing/spend/email:** no agent may publish a Vault offer, execute a trade, send an investor communication or alter a fee.
- **Advertising ≤ 8% revenue:** any future promotion of Vault must be included in the advertising cap calculation and reviewed for financial-promotion rules.
- **Four-eyes / T3/T4:** valuation, fee, release and exception actions need reason, distinct approver and expiry.
- **Append-only audit:** custody events must be immutable when they become real; demo events are labelled.
- **No production claim:** all Vault economics are projections; no offer, solicitation or performance claim is made.

---

## Verification/evidence

| Claim | Evidence available in the prototype | Gap / future evidence |
|---|---|---|
| Simulation only | Demo Vault rows and interactive UI; no custodian/credential/API integration; `FEATURE_STATUS.md` marks custody Blocked | Static and dependency checks proving no custody/settlement provider is reachable. |
| No real assets or title | No title, warrant, token, wallet or fund-transfer artefact in repository | Legal sign-off and independent inventory reconciliation before any real feature. |
| No exchange/broker claims | No matching engine, order book or execution adapter; simulated trades change demo state only | Regulatory licence/registration evidence if a secondary market is ever built. |
| Tenant isolation | Vault migrations enable RLS with `tenant_id`/`user_id` policies | Negative cross-tenant tests for holdings and custody events. |
| No payment coupling | Vault does not call checkout or payment adapter | Code-level assertion and review for any future settlement path. |
| Safe AI interaction | Sommelier/Assist answer Vault questions with simulation/disclaimer copy, no advice | Safety/legal review of final copy; no investment-advice claim. |
| Required controls | Listed above as launch gates | Custodian agreement, legal opinions, registrations, KYC/AML, valuation policy, disclosure, reconciliation and sign-off — **none present**. |

No evidence above supports a claim that Vault is a licensed custody, exchange or investment product.

---

## Review triggers

Reopen this ADR when any of the following occurs:

1. A custodian, warehouse partner, wallet provider or settlement rail is proposed or contacted for integration.
2. Any real asset, lot, warehouse receipt, title document or cash balance is introduced into the system.
3. Fractional ownership, tokenization, security interests or beneficial-ownership records are proposed.
4. A matching engine, order book, market maker, broker or exchange interface is proposed.
5. A fee, valuation, high-water-mark or performance figure changes from demo/projection to real pricing.
6. Legal or regulatory advice is received that changes the feasibility of any Vault feature.
7. Marketing copy uses ownership, return, liquidity or custody language; verify it is labelled and approved.
8. Vault tables gain new write paths or cross-tenant access; re-check RLS and append-only audit.
9. An AI surface gains a Vault tool or external action; route through [`./ADR-0003-ai.md`](./ADR-0003-ai.md) and [`./ADR-0005-agent-boundaries.md`](./ADR-0005-agent-boundaries.md).
10. A launch gate in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) is claimed complete or `NODE_ENV=production` is proposed.
