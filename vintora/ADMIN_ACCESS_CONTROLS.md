# Vintora Admin Privileged-Access Controls

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This document states the required boundary for the 19-workspace Admin Panel and `ADM-19` TechOps. Green checks prove prototype configuration only.

## Authority

Machine authority: [`config/admin-access-policy.json`](./config/admin-access-policy.json), checked by `npm run admin:check`. Identity authority: [`config/identity-access-policy.json`](./config/identity-access-policy.json). Admin remains an internal domain, never a commerce role, and `admin:bypass:commerce` is denied.

## Identity and authentication

No shared super-admin identity is used. Production requires individual accounts with phishing-resistant, hardware-backed MFA, a server-derived identity and no trust in client-supplied roles. The local seeded admin account is generated on first run, password-protected with a `LocalDev-` prefix, local/test-only and not a production account. Session secrets are at least 32 characters, cookies are secure outside local, tokens are stored as hashes, revocation is server-side and sessions expire (12-hour default).

## Least privilege by workspace

Roles are scoped per tenant and workspace across all 19 workspaces. No default all-workspace grant exists; access to `ADM-19` requires an explicit scope. Admin identity never overrides age, commerce, KYC, payment or Vault gates.

## JIT elevation and break glass

Time-boxed JIT elevation defaults to 30 minutes, requires a distinct named approver, a reason of at least eight characters and a workspace scope. Self-approval is denied and expiry is enforced. Break-glass access is also time-boxed (maximum 60 minutes), requires a distinct approver and reason, cannot auto-reset and requires a post-incident review. High-impact actions require a second human approver; production requires IdP-backed approval.

## Audit, alerting and evidence gaps

Local privileged actions are append-only and include MFA, elevation scope, break-glass flag, approver and expiry fields. No external immutable audit sink exists and no WORM-equivalent retention schedule is configured. Login and mutation alerting are required but `alertingConfigured` is false. No production IdP/MFA enrolment, break-glass drill or post-incident review is attached.

## Verification

`npm run admin:check` verifies register/code parity and records the missing external controls. It does not prove MFA enrolment, immutable forwarding, alert routing or safe production operation, and it does not grant launch clearance.

`npm run admin:walkthrough:local` records a local prototype control walkthrough at [`evidence/local-admin-control-walkthrough.json`](./evidence/local-admin-control-walkthrough.json): JIT elevation, distinct-approver gates, session revocation, count-only coverage and local append-only audit, using only the generated local seeded identity. It is not production MFA proof, an immutable external audit sink test, a break-glass incident drill or launch approval.
