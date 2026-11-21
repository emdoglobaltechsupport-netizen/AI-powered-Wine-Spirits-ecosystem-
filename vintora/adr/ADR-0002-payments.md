# ADR-0002 — Payments, FX Lock and Money Movement

## Status

**Accepted for prototype scope.** A simulated payment adapter behind a real interface, idempotent simulated order creation, and a 15-minute FX quote lock are implemented for demo checkout. **Blocked** for live launch: double-entry ledger, PSP settlement ingestion, reconciliation, refunds/disputes, payouts and tax calculation are specified but not implemented. See [`../FINANCIAL_CONTROLS.md`](../FINANCIAL_CONTROLS.md), [`../DISCLAIMER.md`](../DISCLAIMER.md) and [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md).

---

## Context

- Vintora Global Payments is an **internal layer**, not one of the ten market-facing modules. Market and Trade surface checkout; the payment layer serves them.
- Prototype checkout creates a simulated order and payment row. Eight internal FX demo rates are used; a 15-minute quote lock is recorded with the order. No money moves.
- The API already requires an `idempotencyKey` UUID on `POST /v1/checkout/orders`, enforces a unique key on `orders` and `payments`, and replays the original `orderNumber` with `idempotentReplay: true` when the key is repeated.
- Age, KYC and licence assertions are evaluated before an order is accepted. Missing preconditions return `428 precondition_required`; no feature flag may bypass them.
- No PAN, CVV, bank account, government ID or secret is accepted or stored. Session tokens are SHA-256 hashed; password hashes use scrypt; logs are redacted.
- Advertising is capped at ≤ 8% of revenue by design, and refunds/payouts require named human approval with segregation of duties. These are governance constraints even while no money moves.
- The canonical target stack names Stripe, Adyen, local methods and USDC settlement for Vault. Those are roadmap facts, **not** integrations in this repository.

### Canon snapshot

VINTORA — *The World's Cellar, Intelligent.* Ten market-facing modules only. Prototype mode — no real orders are placed. All financial figures are projections or demo values. NO-GO for production. This ADR covers the internal Global Payments layer.

---

## Decision

### 1. Real interface, simulated implementation

- Define a payment adapter contract with operations for quote, authorize/confirm, capture, refund lookup and status. The default adapter is `local` / simulated and returns deterministic results labelled as simulated.
- Adapter selection is configuration-driven (`PAYMENT_PROVIDER=local` in the prototype). A future PSP adapter must implement the same contract; callers must not depend on simulated response quirks.
- **No PAN/CVV.** The API does not accept card data, does not tokenize, and never writes card fields to the database or logs. PCI DSS scope is explicitly deferred to the launch review, not claimed as satisfied.
- Real PSP credentials, keys, webhook URLs and merchant accounts are absent by design and remain absent until the launch gates close.

### 2. Idempotency is mandatory at the boundary

- `idempotencyKey` is required on checkout and stored as a unique key on `orders` and `payments`. Replay returns the original result with `idempotentReplay: true`; concurrent replays must never create two orders.
- The pattern extends to all mutating endpoints per [`../API_POLICY.md`](../API_POLICY.md): scope by `(principal, route, idempotency key)`, include a request-body hash, retain at least 24 hours (7 years for financial mutations where required), return original status/body/headers, and answer `409 conflict` on concurrent divergence.
- Idempotency complements, never replaces, database unique constraints.

### 3. FX quote lock

- Checkout captures a locked FX quote with a quote ID, rate, currency pair and expiry. The prototype TTL is **15 minutes**; the rates are internal demo constants and are labelled as such.
- The locked quote is referenced by the order/payment contract so a later capture or audit can explain the amount. No rate is inferred after the fact.
- Production requires a licensed rate provider, contractually agreed TTLs, spread/fee disclosure and a quote-generation audit record. These are **deferred**.

### 4. Compliance gate precedes payment

- The order state machine checks verified age assertion, KYC status and jurisdictional/licence eligibility before capture. The simulated adapters provide deterministic demo assertions only.
- A precondition failure produces `428 precondition_required`; it is never silently converted into a successful order.
- Refunds, disputes and payouts are future workflows with human approval; no AI agent or mock adapter may approve them autonomously.

### 5. Money representation and financial controls

- Monetary values use numeric minor units plus explicit currency; no floating-point money. Fees, taxes, shipping and FX components are separate fields in the required ledger model, never buried in a single total.
- The following are **specified in [`../FINANCIAL_CONTROLS.md`](../FINANCIAL_CONTROLS.md) and NOT implemented here**:
  - balanced double-entry `ledger_entry` postings with compensating corrections;
  - PSP settlement-file ingestion, normalization and matching engine;
  - hourly/daily/weekly/monthly reconciliation runs with exception ownership and SLAs;
  - refund and chargeback/dispute state machines with evidence packs and deadlines;
  - payout batches from settled, non-disputed ledger entries with distinct maker/checker/releaser;
  - country/region tax rule engine and excise/VAT registration.
- No row in this repository may be represented as a ledger of record or a settled transaction.

### 6. Audit and segregation

- Payment and order mutations emit structured audit records with `requestId`, actor, action, status and redacted snapshots. Append-only storage for financial events is **deferred**; where audit tables exist, triggers reject mutation.
- Financial approvals require a reason, a distinct approver and time-boxed elevation (four-eyes). A person may not approve their own refund or payout.
- Audit exports include hashes and request IDs, never raw card data.

### 7. Launch posture

- **No live launch.** `NODE_ENV=production` is rejected at startup. Live PSP, age-assurance/KYC, ledger, reconciliation, dispute and tax gates in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) must be implemented and independently evidenced first.
- Vault/USDC concepts are out of scope for this ADR; see [`./ADR-0004-custody.md`](./ADR-0004-custody.md).

---

## Consequences

### Positive

- Callers are written against a stable adapter contract, so swapping in a licensed PSP does not require rewriting checkout.
- Card data never enters the system, keeping the prototype outside PCI scope and reducing breach impact.
- Idempotency and unique constraints prevent duplicate demo orders under retry or network replay.
- A locked FX quote makes demo amounts explainable and gives the future ledger a reference point.
- Publishing the gap table alongside the design prevents simulated rows from being misread as settled money.

### Negative

- Deterministic adapters do not exercise real network failures, webhook ordering, partial captures or PSP-specific error taxonomy.
- Without a ledger, there is no independent proof that demo amounts balance; reconciliation logic must be built and tested before launch.
- 15-minute demo TTLs and internal rates are not contractual and must not be quoted to customers.
- Extending idempotency and append-only audit to every mutating endpoint is outstanding work.
- Tax, duties and excise are uncalculated; demo order totals are illustrative only.

---

## Alternatives considered

| Alternative | Why not adopted |
|---|---|
| Integrate Stripe/Adyen directly in the API now | Requires real credentials, PCI scope, licensing and settlement controls; directly contradicts NO-GO. |
| Accept and store card numbers with encryption at rest | Unnecessary risk; no real transaction exists. PAN/CVV acceptance is prohibited by policy. |
| Floating-point money totals | Rounding errors are unacceptable for a future ledger; numeric minor units chosen. |
| Trust client-supplied amount/currency | Server-side catalogue and locked quote must determine amounts; client totals are advisory only. |
| Skip idempotency until live PSP | Retries would create duplicate demo orders and hide a class of production bug until the worst moment. |
| Treat payment rows as the ledger | Payment status is not an accounting record; double-entry postings are required for audit and reconciliation. |
| Use live FX rates from a public feed | No licence, SLA or quote evidence; internal demo constants are clearly labelled and deterministic. |

---

## Compliance/guardrail implications

- **Age/KYC/licence before order:** enforced as a synchronous precondition with `428`; simulated only.
- **Human approval:** refunds, disputes, payout batches and manual ledger adjustments require named human approval and a distinct approver.
- **No autonomous publishing/spend/email:** payment layer exposes no external action an agent may invoke without approval; see [`./ADR-0005-agent-boundaries.md`](./ADR-0005-agent-boundaries.md).
- **Advertising ≤ 8% revenue:** any future promoted-listing or campaign charge must remain within the cap and be reported separately from payment revenue; no ad-spend endpoint exists in prototype mode.
- **Kill switch:** AI controls are separate (see [`./ADR-0003-ai.md`](./ADR-0003-ai.md)); payment outages require an operational stop mechanism before launch.
- **Audit:** redaction of PAN/CVV/tokens is mandatory; append-only financial audit is a launch gate.
- **Retention:** financial records target seven years where required; not yet enforced.

---

## Verification/evidence

| Claim | Evidence available in the prototype | Gap / future evidence |
|---|---|---|
| Simulated adapter only | `PAYMENT_PROVIDER=local`; deterministic payment rows; no credentials in `.env.example` or fixtures | Prove no live PSP endpoint is reachable from any environment. |
| No card data | Boundary schemas reject card fields; log/DB inspection shows no PAN/CVV columns | Automated secret/PAN scanning and PCI scope review. |
| Idempotency | Unique key on `orders`/`payments`; `idempotentReplay: true` on replay; smoke coverage in `npm run test:smoke` | Concurrent-replay test and body-hash mismatch test across all mutating endpoints. |
| 15-minute FX lock | Quote ID, rate and expiry stored with demo checkout | Licensed rate provider contract and quote audit record. |
| Compliance precondition | Age assertion required on commerce routes; `428` in error contract | Certified age assurance/KYC provider and jurisdictional licence evidence. |
| Ledger/reconciliation/disputes | Defined in [`../FINANCIAL_CONTROLS.md`](../FINANCIAL_CONTROLS.md) | Implementation plus matching, exception, dispute and payout drill evidence; **none today**. |
| No production startup | `NODE_ENV=production` rejected at startup | Launch gate sign-off before the guard is replaced. |

No evidence above supports a claim of production payment readiness. All amounts are demo values or projections.

---

## Review triggers

Reopen this ADR when any of the following occurs:

1. Any proposal to accept real card data, real bank details or real PSP credentials.
2. A PSP adapter, webhook handler or settlement-file importer is added.
3. A ledger posting, reconciliation run, refund, dispute or payout is implemented or simulated with new state transitions.
4. FX TTL, rate source or currency set changes; a new local method (for example an Africa Marketplace candidate) is enabled.
5. A duplicate order, double capture or idempotency-key collision is observed.
6. Age/KYC/licence preconditions are relaxed, reordered, or made feature-flaggable.
7. Advertising spend controls or promoted-listing charges are introduced; verify the ≤ 8% cap.
8. Retention requirements change for financial audit records.
9. A launch gate in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) is claimed complete or `NODE_ENV=production` is proposed.
10. Vault or USDC settlement is proposed; route to [`./ADR-0004-custody.md`](./ADR-0004-custody.md) before any work starts.
