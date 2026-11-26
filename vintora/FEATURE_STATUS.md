# Vintora Feature Status Matrix

**Legend**

| Dimension | Values |
|---|---|
| Implementation | `Implemented` (runnable), `Simulated` (deterministic adapter only), `Schema-only`, `Specified`, `Planned`, `Not implemented` |
| Regulation | `Not assessed`, `Local counsel required`, `Licensed provider required`, `Rights evidence required`, `No live claim`, `Not applicable` |
| Evidence gate | `No-Go`, `Prototype-only`, `Design-ready`, `Conditional`, `Blocked` |
| Maturity state | `Design`, `Prototype`, `Pilot`, `Production` |

This matrix is a snapshot of the repository, not a roadmap promise. It proves **Phase 1 gates only**. `No-Go` is the default for anything that touches money, alcohol regulation, identity, custody or external AI actions. Reconciled claims and counts are in [`VALIDATION_STATUS.md`](./VALIDATION_STATUS.md).

**Maturity states** are lifecycle labels, not evidence of launch permission:

| State | Meaning in this repository |
|---|---|
| **Design** | Documented intent, register, wireframe or workflow with no runnable artifact or live effect. |
| **Prototype** | Runnable local demo with demo data or deterministic/simulated adapters; no external side effects. |
| **Pilot** | Restricted live operation with licensed providers and controlled users. No Phase 1 component is in this state. |
| **Production** | Public live operation after security, reliability and compliance evidence plus explicit launch approval. No Phase 1 component is in this state. |

Every current area is **not production-ready**; the term is reserved for components with passed security, reliability and compliance evidence and an approved launch record. The "Evidence gate" column below records unresolved gates, not a claim that any component qualifies. Module and environment lifecycle mappings are in [`README.md`](./README.md) and the machine register [`config/implementation-status.json`](./config/implementation-status.json).

---

## 1. Market-facing product and commerce

| Area | Implementation | Regulation | Evidence gate | Evidence / next gate |
|---|---|---|---|---|
| Age gate | Implemented (local demo) | Local counsel required | Prototype-only | DB-backed assertion, timestamp, 720-hour evidence expiry; replace with certified provider |
| KYC | Simulated fail-closed adapter | Licensed provider required | No-Go | `KYC_PROVIDER=local`; required simulated evidence, no real verification |
| AML / sanctions / PEP screening | Simulated fail-closed adapter | Licensed lists and monitoring required | No-Go | Five-control checkout evaluator; fixture labels only; [`COMMERCE_SAFEGUARDS.md`](./COMMERCE_SAFEGUARDS.md) |
| Payment authorisation | Simulated adapter interface | Licensed PSP / PCI required | No-Go | `PaymentAuthorizationAdapter`; any non-simulated provider fails closed |
| Catalogue provenance | Implemented (demo label) | Rights evidence required | Prototype-only | 12 seed rows labelled demo; verified adapter disabled; [`CATALOGUE_PROVENANCE.md`](./CATALOGUE_PROVENANCE.md) |
| Catalogue browse and search | Implemented (12 demo products) | Rights evidence required | Prototype-only | `GET /v1/products`; full-text index in domain tables |
| Product detail and provenance | Implemented (illustrative) | Rights evidence required | Prototype-only | Demo provenance chain; no supplier attestation |
| Sommelier | Simulated deterministic adapter | No live claim | Prototype-only | Grounded guidance with safety note; no model calls |
| Assist | Simulated deterministic adapter | No live claim | Prototype-only | Confirmation architecture; no external actions |
| Cart and checkout | Implemented (simulated order) | Licensed provider required | No-Go | 15-minute FX lock, five enforced simulated safeguards, append-only decisions; no PSP |
| Orders | Implemented (demo rows) | Local counsel required | Prototype-only | Idempotent simulated order creation |
| Multi-currency | Implemented (8 demo rates) | Licensed rate provider required | Prototype-only | FX rates are internal constants |
| Club / Rewards / Vault / Trade / Seller / Flow / Studio | Interactive simulations | Varies by domain | No-Go | Canonical modules preserved; real APIs pending |
| Vault custody / fractional ownership | Simulated concept | Licensed custodian required | Blocked | See [ADR-0004](./adr/ADR-0004-custody.md) |
| Local payment gateways (Africa) | Candidate registry only | Licensed provider required | No-Go | Four adapter candidates; no credentials or integrations |

## 2. Internal platform and governance

| Area | Implementation | Regulation | Evidence gate | Evidence / next gate |
|---|---|---|---|---|
| Admin console | Implemented (19 workspaces) | Not applicable | Prototype-only | Deny-by-default admin permission, live time-boxed elevation, count-only coverage, guarded mutations |
| B2C/B2B/Seller/Vault/Admin boundaries | Implemented in prototype policy | Local counsel required | Prototype-only | [`IDENTITY_ACCESS_BOUNDARIES.md`](./IDENTITY_ACCESS_BOUNDARIES.md), `npm run identity:check`, deny-by-default shared policy |
| Admin coverage reporting | Implemented (count only) | No PII | Prototype-only | `/v1/admin/coverage`; demo labels |
| T3/T4 approvals | Implemented in simulation | Not applicable | Design-ready | Elevation, reason, distinct approver, expiry |
| AI kill switch | Simulated toggle, `< 1 min` design SLO | No live claim | Design-ready | Must be tested against real adapters before launch |
| Grandfathered admin access | Simulated | Privacy review required | No-Go | Need data-retention and legal basis review |
| Append-only audit | Implemented for Admin, catalogue and authorization decisions | Not applicable | Design-ready | Triggers reject mutation; general API audit is stdout baseline |
| Privacy-by-design controls | Implemented prototype control plane | Privacy review required | Blocked for production | No DPIA or retention job; [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md) |
| Accessibility (WCAG 2.2 AA) | Specified; not audited | Not applicable | No-Go | No keyboard, screen-reader, contrast or AT audit completed |
| Inclusivity / RTL | Specified; three UI locales, five registry locales | Local counsel required | Prototype-only | RTL UI and in-country cultural review not implemented |
| Canon ownership / change control | Specified | Not applicable | Design-ready | [CANON_GOVERNANCE.md](./CANON_GOVERNANCE.md); four-eyes RFC process |
| Market forecast provenance | Implemented (16-record register) | No live claim | Design-ready | All records uncited Low confidence; metadata check only, not fact validation |
| Public launch gate | Implemented (fail-closed manifest) | Counsel sign-off required | Blocked | `config/launch-manifest.json`; `npm run launch:check`; Legal/Compliance approvers null |
| Commercial licence register | Implemented (six domains) | Counsel evidence required | Blocked | All domains `not_obtained` with null evidence refs; npm SPDX policy is separate |
| Internal AI agent controls | Implemented advisory evaluator, allowlist and append-only audit | No live claim | Blocked for autonomy | [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md), `npm run agents:check`; kill-switch drill outstanding |
| AI personalization consent | Implemented prototype policy, evaluator, API and append-only audit | DPIA required | Blocked for profiling | [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md), `npm run privacy:check`; closed-loop disabled, no DPIA |
| AI marketing human release | Implemented draft-only evaluator, API and append-only audit | Alcohol-ad counsel required | Blocked for release | [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md), `npm run marketing:check`; no live platform or spend |
| High-risk activation gate | Implemented (17 blocked records) | Licensed provider / counsel required | Blocked | `npm run gates:check`; no legal/compliance sign-off granted |

## 3. Data pipelines and market expansion

| Area | Implementation | Regulation | Evidence gate | Evidence / next gate |
|---|---|---|---|---|
| Verified beverage catalogue pipeline | Implemented | Rights evidence required | Design-ready | 18 assertions; licensed-feed adapter; honest coverage report |
| Wine Accessories domain | Implemented | Rights evidence required | Design-ready | 36 assertions; licence/moderation gates; append-only audit |
| Africa Marketplace registry | Implemented | Local counsel required | Design-ready | Generated assertion count; 14 target-market records, 5 registry languages, 38 candidate names; no country activation; activation gate blocked |
| Real brand onboarding | Specified only | Rights evidence required | No-Go | Identity, trademark and authorisation evidence not supplied |
| Real distributor onboarding | Schema-only | Licensed provider required | No-Go | KYC and licence evidence not supplied |
| Country regulation rules | Registry profiles only | Local counsel required | No-Go | No legal rule or tax rate is asserted |
| Multilingual UI (en/fr/es) | Implemented | Not applicable | Prototype-only | Africa registry includes five languages; UI remains three |

## 4. API and platform controls

| Area | Implementation | Regulation | Evidence gate | Evidence / next gate |
|---|---|---|---|---|
| API versioning | Implemented (`/v1` + version header) | Not applicable | Design-ready | See [API_POLICY.md](./API_POLICY.md) |
| Session authentication | Implemented (demo users) | Privacy review required | Prototype-only | httpOnly cookie; hashed session tokens; replace demo identities |
| Production IdP / MFA | Not implemented | Privacy review required | Blocked | Required before launch |
| Rate limiting | Implemented baseline (in-memory) | Not applicable | Prototype-only | Distributed limiter required for production |
| Idempotency | Implemented for checkout | Not applicable | Design-ready | Extend to all mutating endpoints |
| Request audit logging | Implemented baseline (structured stdout) | Not applicable | Prototype-only | Move to append-only store with retention controls |
| Privacy consent / DSAR API | Implemented (simulated) | Privacy review required | Prototype-only | `/v1/privacy/*`; purpose-limited consent, demo export, human-reviewed deletion, append-only audit |
| Marketing release evaluation API | Implemented (draft-only) | Alcohol-ad counsel required | Blocked for release | `/v1/admin/marketing/*`; no live platform, spend or email send |
| Financial reconciliation | Specified only | Licensed provider required | No-Go | See [FINANCIAL_CONTROLS.md](./FINANCIAL_CONTROLS.md) |
| Chargeback/dispute workflow | Specified only | Licensed provider required | No-Go | Evidence and deadline engine pending |
| CI: typechecks and tests | Implemented | Not applicable | Design-ready | `.github/workflows/ci-typecheck-tests.yml` |
| CI: migrations | Implemented | Not applicable | Design-ready | Idempotent setup applied twice in PostgreSQL service |
| CI: security scanning | Implemented | Not applicable | Conditional | Deterministic secret scan, optional gitleaks, licence/pin checks, SBOM freshness, scoped audit gate, CodeQL; time-boxed Zod exception |
| CI: build verification | Implemented | Not applicable | Design-ready | `.github/workflows/ci-build.yml` |
| SBOM and dependency policy | Implemented | Not applicable | Design-ready | CycloneDX JSON + [SECURITY.md](./SECURITY.md) |
| Secret and demo-credential scanning | Implemented | Not applicable | Design-ready | `npm run secrets:scan`, `npm run credentials:check`, `config/credential-policy.json`, `config/gitleaks.toml`; generated local-only credentials, explicit `db:seed:dev`, production seeding disabled, rotation runbook in `SETUP.md` |
| Dependency and licence management | Implemented (policy + weekly Dependabot) | Not applicable | Design-ready | [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md), `npm run licenses:check`; patch timelines and exception rules defined |
| Container and IaC scanning | Implemented (Trivy workflow) | Not applicable | Prototype-only | `ci-supply-chain.yml` publishes SARIF; release workflow blocks High/Critical; not executed locally |
| Immutable artifact pinning | Implemented | Not applicable | Design-ready | Digest-pinned images, SHA-pinned actions, `npm run artifacts:check` |
| Release artifact signing | Implemented (cosign workflow) | Not applicable | Prototype-only | `release.yml` signs/verifies image, SBOM and checksums; no local release has been signed |
| One-command verified setup | Implemented (Docker Compose) | Not applicable | Prototype-only | `npm run setup` generates `.env`, starts services, migrates and verifies |
| Platform-neutral static server | Implemented (Node) | Not applicable | Design-ready | `npm run prototype` replaces the Windows-only PowerShell launcher |
| Load testing / production DR drill | Planned | Not applicable | Blocked | Required by [LAUNCH_READINESS.md](./LAUNCH_READINESS.md); a local prototype logical restore drill is attached at [`evidence/local-dr-drill.json`](./evidence/local-dr-drill.json), with no production recovery evidence |

---

## 5. Release verdict

**Overall status: NO-GO.** The repository is safe for local development, demonstration and architecture review. It must not accept live orders, live payments, real personal data, regulated alcohol transactions, real advertising spend or customer-facing AI actions until the corresponding gates above are closed and independently evidenced.
