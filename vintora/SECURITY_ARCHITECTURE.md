# Vintora Security Architecture and Threat Model

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This is a concise control specification, not an audit, penetration test or compliance attestation. Machine authority: [`config/security-architecture.json`](./config/security-architecture.json), checked by `npm run security:check`.

## Assets and classification

Restricted: customer identity, age/KYC evidence, payment tokens and ledger records, admin sessions and audit events, Vault blueprint records. Confidential: catalogue provenance and AI prompts/retrieval logs. Every asset has a named owner role in the register.

## Trust boundaries

| Boundary | Transition | Required controls |
|---|---|---|
| User | Public storefront → API | Age gate, server-issued session cookie, `SameSite=strict`, server-derived cart/quote |
| Seller | Seller console → API | Business verification, tenant membership, listing-ownership check, trade licence evidence |
| Admin | Admin console → 19 internal workspaces | Individual MFA account, workspace-scoped RBAC, JIT elevation, distinct four-eyes approval |
| API | HTTP → domain services | Version negotiation, validation, prototype rate limit, fail-closed evaluators |
| Service | Service → PostgreSQL | Tenant-scoped queries, RLS policies, parameterised statements, append-only local audit |
| External | Prototype → providers | Mock-only adapters, runtime profile guard, two independent live opt-ins, no external effects |

## Threats and mitigations

Eight threats are registered (spoofing, tampering, repudiation, information disclosure, denial of service, privilege elevation, supply chain and unsafe AI output), each with controls and an `evidenceRef` of `null`. Admin identity never overrides age, commerce, KYC, payment or Vault gates; `admin:bypass:commerce` is denied.

## Authentication and session handling

Individual accounts with phishing-resistant, hardware-backed MFA are required in production; no shared super-admin identity exists. Identity is server-derived and never trusted from headers. Cookies are HTTP-only, `SameSite=strict` and secure outside local development; session secrets are at least 32 characters, tokens are stored as hashes and revocation is server-side with a 12-hour default TTL. See [`ADMIN_ACCESS_CONTROLS.md`](./ADMIN_ACCESS_CONTROLS.md).

## Tenant isolation and RLS testing

All queries are tenant-scoped and PostgreSQL row-level security policies (`tenant_isolation`, `tenant_user_isolation`) are defined in the migrations. Cross-tenant read and write deny tests are required for every tenant table; `rlsEvidenceRef` is null. No RLS test run is attached to a staging or production database.

## Encryption and transport

TLS 1.2+ is required outside local development. Managed encryption at rest with separately held keys is required before launch; KMS key custody is undefined and `evidenceRef` is null. No TLS or at-rest configuration evidence is attached.

## Dependency, container and secret controls

Locked installs, secret/licence/ artefact scans, SBOM generation and digest-pinned images are defined in CI. Container scanning is defined but no local Trivy evidence is attached. Secrets come from the environment only; mock credentials are blocked outside local/test and startup logs emit mode labels only, never values. See [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md).

## Incident response and data-breach playbooks

Incident response is human-led. The break-glass workflow is time-boxed, distinct-approved and requires a post-incident review. The data-breach playbook steps are contain, preserve evidence, identify affected tenants and records, notify legal/regulator per jurisdiction, remediate and review. No drill evidence is attached and notification clocks are undefined. Distributed rate limiting and an external immutable audit sink are specified but not implemented.

## Verification and boundaries

`npm run security:check` verifies register/doc/code parity and records the missing evidence. `npm run secrets:scan`, `npm run sbom:check`, `npm run artifacts:check`, `npm run identity:check`, `npm run boundaries:check` and `npm run ci:verify` are required verification commands. A green result proves configuration consistency only; it is not a penetration test, audit, compliance attestation or launch clearance.
