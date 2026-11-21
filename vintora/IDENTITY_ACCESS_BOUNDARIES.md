# Vintora Identity, Access and Compliance Boundaries

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.** Business verification, credit, custody and investment records in this repository are deterministic simulations. No real trading, lending, custody or investment service is provided.

This document makes the B2C, B2B and Vault boundaries explicit. The product sharing one brand, platform and data flywheel does **not** mean that a person, account, permission or dataset may cross those boundaries.

## 1. Boundary statement

| Domain | Allowed principal | Separated obligations | Default access |
|---|---|---|---|
| Consumer Market, Cart, Checkout, Club | `customer` | Age assurance, consumer jurisdiction, consumer tax and delivery rules | Deny; permit only after age verification |
| Vintora Trade | `distributor` or verified `merchant` acting as a wholesale buyer | Business identity/KYC, alcohol licence, seller/distributor agreement, credit terms, contract and VAT invoices | Deny; permit only after business verification and applicable licence checks |
| Vintora Seller | `merchant` | Merchant KYB, payout account, listing rights, inventory ownership, tax reporting | Deny; permit only for the merchant tenant that owns the listing |
| Vintora Vault | `customer` or `merchant` with a separate investor eligibility record | Investor suitability, accredited/qualified status where required, custody, segregation, secondary-market rules | Deny; simulated holdings only, no real asset transfer |
| Admin | internal `admin` staff identity | Four-eyes, elevation, T3/T4 reasons, kill switch, audit | Deny; internal tenant only, never a commerce role |

A single human identity may hold **one primary commerce role per tenant** in this prototype. A person needing both consumer and wholesale access must use separately verified accounts with separate sessions and must not share credentials. Admin is an internal staff role, not a commerce role, and must not be used to bypass customer, merchant, distributor or investor checks.

## 2. Deny-by-default rules

1. A request without an authenticated principal is denied.
2. A principal without the required role, tenant membership, jurisdiction permission and transaction permission is denied.
3. Unknown roles, unknown domains, missing verification and malformed context are denied; they never fail open.
4. Data queries are scoped to the session tenant by application policy and PostgreSQL row-level security.
5. Cross-tenant reads, writes and ID enumeration return `403 forbidden` or `404 not_found` without revealing resource existence.
6. Admin elevation is scoped to a purpose, role, tenant and expiry. A global admin session does not grant commerce permissions.
7. Every denied boundary attempt is audited with request ID, actor, domain, required permission and reason.

## 3. Permission model

Permissions are `domain:action:scope` strings. The authoritative policy is in [`config/identity-access-policy.json`](./config/identity-access-policy.json).

| Permission | `customer` | `merchant` | `distributor` | `admin` |
|---|---:|---:|---:|---:|
| `market:browse:tenant` | Yes after age gate | No | No | No |
| `market:checkout:tenant` | Yes after age gate | No | No | No |
| `seller:listing:write:tenant` | No | Yes for owned tenant | No | No |
| `trade:supplier:read:tenant` | No | Yes when wholesale verified | Yes when verified | No |
| `trade:rfq:read:tenant` | No | Yes when wholesale verified | Yes when verified | No |
| `trade:rfq:write:tenant` | No | Yes when wholesale verified | Yes when verified | No |
| `trade:quote:read:tenant` | No | Yes for own RFQ | Yes for own quote | No |
| `trade:credit:read:tenant` | No | Yes within own tenant | Yes within own tenant | No |
| `trade:order:write:tenant` | No | Yes within credit terms | Yes within credit terms | No |
| `vault:holding:read:tenant` | Yes after investor eligibility | Yes after investor eligibility | No by default | No |
| `vault:trade:write:tenant` | No | No | No | No |
| `admin:*:internal` | No | No | No | Yes, elevated with distinct approver |

`vault:trade:write:tenant` remains blocked in Phase 1. Vault is a design simulation and no real investment order may be created.

## 4. Tenant and jurisdiction isolation

- Every commerce principal is bound to exactly one active tenant per session.
- Every tenant-scoped entity carries `tenant_id`; the session tenant is the only permitted value.
- Cross-tenant records are invisible to application queries and blocked by RLS.
- Jurisdiction is evaluated separately from role: an allowed role in an unlicensed jurisdiction remains denied.
- Merchant listings, distributor contracts, consumer orders and Vault holdings are not merged into a shared account view. The storefront may render module panels, but the API and database remain separated by role and tenant.

## 5. Business trading verification

Before a merchant or distributor can trade, all applicable checks must pass:

1. Distinct legal entity record with legal name, registration number and registered address.
2. KYB/verification status `verified`; unverified, pending, expired and rejected statuses deny trading.
3. Alcohol sales, distribution or import licence evidence for the transaction jurisdiction where required.
4. Named authorised buyer and, for regulated operations, a second business approver.
5. Accepted contract or terms version with effective and expiry dates.
6. Credit assessment with an approved limit and currency.

Deterministic prototype values are labelled as simulated; they are not evidence of a real licence or credit decision.

## 6. Credit and contract controls

- Trade orders are denied when the principal is unverified, the contract is inactive/expired, the requested jurisdiction is not permitted, or the order would exceed available credit.
- `available_credit = credit_limit - credit_used - reserved_credit`, never a client-supplied value.
- Credit-limit increases, unusual payment terms and contract changes require maker/checker approval with a distinct approver, reason and audit record.
- Credit exposure is tenant- and currency-specific; a limit in one tenant or currency does not authorize another.
- No AI agent or unattended job may extend credit, accept a contract or waive a verification requirement. Internal ADM-19 agents are advisory-only with a machine-checked tool allowlist, distinct human approval, credential/network isolation, prompt-injection rejection, append-only decision audit and an independent safe stop; see [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md).

## 7. High-risk approvals

| Operation | Extra control |
|---|---|
| Business account verification | Compliance reviewer distinct from submitter |
| Credit limit or terms change | Finance approval plus contract evidence |
| Wholesale order above threshold | Named business approver and credit recheck |
| Consumer age/KYC exception | Denied in prototype; no manual override path |
| Vault eligibility or holding change | Blocked in Phase 1; future investor approval must be distinct from seller |
| Admin T3/T4 operation | Elevation, reason, distinct approver, time-boxed break-glass, append-only audit |

## 8. Testing requirement

Automated checks must prove that:

- A `customer` cannot call merchant, distributor, Vault-restricted or Admin operations.
- A `merchant` cannot read another tenant's listing, RFQ, quote, order or holding.
- A `distributor` cannot use consumer checkout or another distributor's credit.
- An internal `admin` role cannot bypass age, KYB, credit or investor checks.
- Unverified, expired, wrong-jurisdiction and wrong-tenant principals are denied.
- Deny decisions never reveal whether a resource exists in another tenant.

Phase 1 uses deterministic policy tests plus API smoke checks. Production must add integration tests against real RLS, production IdP group claims and the central audit store before launch.

## 9. Phase 1 implementation evidence

- [`config/identity-access-policy.json`](./config/identity-access-policy.json) is the machine-readable role and denial register; `npm run identity:check` verifies it against the code and evidence files.
- [`packages/shared/src/compliance.ts`](./packages/shared/src/compliance.ts) is the single pure `authorizeAccess()` decision point for role, tenant, jurisdiction, ownership, age, business verification, licence, contract, authorised buyer, credit, currency, investor and admin-elevation checks.
- Migrations `0014_identity_access_boundaries.sql` and `0015_force_identity_rls.sql` add tenant/role/jurisdiction/investor columns, business membership and contracts, live session/login tenant scoping, forced RLS on principal/session/B2B tables, and an append-only `authorization_decisions` log. No `BYPASSRLS` grant is made, and the table owner cannot bypass RLS.
- `services/api/src/middleware/auth.ts` derives one primary commerce role, verified age country, business account, server-owned credit and live `admin_sessions` elevation from the session; no client header can assert verification.
- `services/api/src/middleware/access.ts` applies the shared decision to authenticated routes, records every allow/deny, and filters Trade list responses to the verified jurisdiction intersection.
- `npm run test:shared`, `npm run test:smoke` and `npm run identity:check` cover cross-tenant denial, role boundaries, jurisdiction denial, header spoof rejection, server-derived credit/approval threshold and append-only audit. `npm run agents:check` adds deny-by-default internal-agent tool, approval, isolation and audit checks; see [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md).

Admin routes are guarded by `requireAccess('admin:*:internal')`, so an active Admin role alone is insufficient: `auth.ts` derives live, time-boxed `admin_sessions` state and the shared policy requires valid elevation with a distinct approver where break-glass is used. Elevation creation and session end are the only bootstrap exceptions and remain role-gated. High-risk actions (approvals, kill switch, model promotion) additionally require a named distinct approver and reason. Production must replace the local elevation records with IdP/MFA backed, centrally retained evidence and independently prove every privileged route before launch.

## 10. Residual gaps

- Production identity provider, MFA, device/session revocation and step-up authentication are specified but not implemented.
- Real KYB, licence, credit bureau, contract and investor-suitability providers are not connected.
- Vault trading remains blocked and no custody, broker or investment service is provided.
- Green prototype tests do not change the NO-GO launch posture.
