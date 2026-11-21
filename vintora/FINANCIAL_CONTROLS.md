# Vintora Financial Reconciliation and Dispute Workflows

> All payment data in this repository is simulated. This document defines the required production control model; it does not claim that live financial activity exists.

---

## 1. Scope

Applies to:

- Customer payments, refunds and chargebacks.
- Payouts to sellers, distributors and other counterparties.
- FX quotes and conversions.
- Fees, commissions, excise/VAT and insurance components.
- Ledger postings and settlement files from payment service providers.

Current state: simulated `payments` rows, 15-minute FX quote lock and idempotent order creation. No PSP, ledger service or settlement feed is connected.

---

## 2. Ledger model

### 2.1 Required records

| Record | Purpose |
|---|---|
| `payment_intent` | Desired charge, amount, currency, order reference, idempotency key |
| `payment_capture` | Confirmed capture from PSP, processor reference, settlement date |
| `refund` | Full or partial refund, reason, approver, linked capture |
| `chargeback` | Network dispute, reason code, deadline, evidence state |
| `payout` | Counterparty payout, bank reference, status |
| `ledger_entry` | Double-entry posting: debit/credit, account, amount, currency |
| `fx_quote` | Locked rate, expiry, source, quote ID |
| `reconciliation_run` | Batch, period, provider, status, matcher version |
| `reconciliation_exception` | Unmatched or variance item with owner and SLA |

### 2.2 Posting rules

- Every settled financial event creates balanced double-entry postings.
- Amounts are stored in minor units plus currency; no floating-point money.
- FX conversion references a locked quote with a 15-minute expiry in the demo contract; production quote TTLs must be contractually agreed.
- Fees, taxes and shipping are separate ledger components, never buried in a single total.
- No ledger entry is updated in place; corrections use compensating entries.
- Every mutation carries an idempotency key and an append-only audit record.

---

## 3. Reconciliation workflow

### 3.1 Schedule

| Run | Cadence | Purpose |
|---|---|---|
| Intraday sweep | Hourly | Detect capture/status drift early |
| Daily settlement | Daily, 06:00 local | Match prior-day PSP settlement to ledger |
| Weekly payout check | Weekly | Verify seller/distributor payouts against payable ledger |
| Monthly close | Monthly | Freeze period, certify exceptions and variance report |

### 3.2 State machine

```text
scheduled → fetching → normalising → matching → reviewing → closed
                                      ↓
                                  exception → evidence → resolution → closed
```

### 3.3 Matching rules

Match in this order:

1. Processor reference + capture ID.
2. Order ID + idempotency key + amount + currency.
3. Amount + currency + settlement date + counterparty, only when 1 and 2 are unavailable and marked `low-confidence`.

Tolerance policy:

| Difference | Action |
|---|---|
| Exact match | Auto-close |
| Fee/rounding difference within configured tolerance | Post to clearing account, flag for review |
| Amount/currency mismatch | Exception, block payout |
| Missing ledger entry | Create pending investigation, never auto-post |
| Duplicate settlement | Exception, block and preserve evidence |
| Unknown counterparty | Exception, compliance review |

### 3.4 Exception ownership

- Each exception has an owner, severity, ageing bucket and due date.
- Severity `critical` blocks related payouts and requires same-day review.
- Exceptions older than 24 hours escalate to Finance Lead; older than 72 hours to CFO/Compliance.
- Closure reason and approver are mandatory.
- Auto-closing is allowed only for exact matches and tolerance postings with reviewed rules.

---

## 4. Refund workflow

```text
requested → validated → approved → submitted → confirmed → closed
                 ↓          ↓           ↓
               rejected  denied      failed → retry / manual
```

Requirements:

- Customer refund requests are linked to the original capture and order.
- Refund amount may not exceed remaining refundable amount.
- Full refunds above the configured threshold require two approvers.
- Partial refunds require a reason code.
- No refund is issued from an AI agent without human approval.
- PSP refund references are stored and reconciled.

---

## 5. Chargeback / dispute workflow

```text
opened → evidence_collected → represented → awaiting_network
       → resolved_won | resolved_lost → closed
```

### 5.1 On notification

1. Record network case ID, reason code, amount, currency and response deadline.
2. Lock related order, payment, delivery and age-verification evidence.
3. Assign an owner and calculate the deadline from the PSP/network notice.
4. Block related seller payout where required.
5. Notify Compliance and Finance.

### 5.2 Evidence pack

- Order and idempotency records.
- Age verification assertion and KYC status where applicable.
- Delivery proof and carrier events.
- Product/licensing records and invoice.
- Customer communications and consent records.
- FX quote and ledger entries.

### 5.3 Representation

- Evidence pack review requires a named human approver.
- Submission uses a logged adapter call with PSP case reference.
- No autonomous submission, settlement acceptance or evidence fabrication.
- Outcomes update the ledger using compensating entries where needed.
- Lost disputes post chargeback fees to the correct expense account.

---

## 6. Payout reconciliation

- Seller/distributor payouts are calculated from settled, reconciled and non-disputed ledger entries only.
- Payout batches require Finance approval and a distinct releaser.
- Each payout stores counterparty, bank reference, amount, currency and status.
- Failed payouts return to the payable state with an exception record.
- Payout exports must be reproducible from the ledger for audit.

---

## 7. Segregation of duties

| Action | Maker | Checker | Blocker |
|---|---|---|---|
| Refund above threshold | Support | Finance | Second approver required |
| Payout batch | Finance | Finance Lead | Distinct releaser |
| Manual ledger adjustment | Accountant | Controller | Reason required |
| Dispute representation | Support/Compliance | Legal/Finance | Human approval |
| Tax rule change | Tax Analyst | Tax Lead | Effective date required |

A person may not approve their own request. Elevated actions are time-boxed and audited.

---

## 8. Audit and retention

- Reconciliation runs, exceptions, approvals, refunds, disputes and payouts write append-only audit records.
- Financial records are retained according to jurisdiction; default design target is seven years.
- Audit exports include hashes and request IDs but never raw card data.
- Monthly close packages are immutable after sign-off.

---

## 9. Current implementation gap

| Control | Current status |
|---|---|
| Simulated payment rows | Implemented |
| Idempotent simulated order creation | Implemented |
| 15-minute FX quote lock | Implemented |
| Double-entry ledger | Specified, not implemented |
| PSP settlement ingestion | Not implemented |
| Automated matching engine | Not implemented |
| Refund/dispute state machines | Specified, not implemented |
| Payout batch controls | Specified, not implemented |

No financial workflow in this repository may be described as production ready until the gap table is closed and independently tested. All current workflows are prototype-only.
