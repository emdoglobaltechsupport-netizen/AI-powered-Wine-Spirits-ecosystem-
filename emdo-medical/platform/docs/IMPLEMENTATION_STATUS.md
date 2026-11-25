# EMDO Medical — implementation status

> **Overall: NO-GO FOR PUBLIC LAUNCH. No hosted CI run is attached to this workspace; a green local run proves prototype gates only.** Implemented scope is the platform foundation, EMDO Record, EMDO Care (doctor verification, verified-only directory and appointments), EMDO Assist (offline AI foundation), the M10 EMDO Insight aggregate API and the Next.js Super Admin portal, all in **Prototype** state and validated by automated tests against local PostgreSQL and a local Next.js build. No real patient data, no activated country, no clinical use, no external model calls, no business source modules and no hosted deployment.

## 1. What is implemented and tested

| Area | Status | Evidence |
|---|---|---|
| NestJS + TypeScript API skeleton | Implemented | `apps/api/src/main.ts`, `app.module.ts`; `npm run build` passes |
| Environment validation and fail-closed country mode | Implemented/tested | `env.validation.spec.ts` (3 tests) |
| PostgreSQL schema and migrations | Implemented/tested | `001_foundation.sql`; migration applied locally; e2e setup applies it to test DB |
| Row-level security with FORCE policies | Implemented/tested | E2E cross-tenant denial, consent-based read, revocation denial |
| scrypt password hashing + JWT access + rotating refresh tokens | Implemented/tested | `password.service.spec.ts`; e2e register/login/refresh paths |
| RBAC + country guard + consent-based ABAC | Implemented/tested | E2E role-gate, country gate, patient/caregiver access |
| AES-256-GCM tenant-derived encryption + integrity hash | Implemented/tested | `crypto.service.spec.ts` round-trip, cross-tenant failure, tamper detection |
| FHIR-compatible structural validation | Implemented/tested | `fhir.spec.ts`, e2e AI-author rejection |
| Consent create/list/revoke with fresh-auth and expiry | Implemented/tested | E2E consent grant, scoped read, immediate revocation |
| Append-only audit with PHI-safe metadata | Implemented/tested | `audit-sanitizer.spec.ts`, e2e audit query and role denial |
| Record create/read/list/correct/versions | Implemented/tested | E2E versioning and ownership assertions |
| API documentation | Implemented | `docs/API_DOCUMENTATION.md`, Swagger UI at `/api/docs` |
| Security documentation | Implemented | `docs/SECURITY.md` |
| Deployment and backup/DR instructions | Implemented | `docs/DEPLOYMENT.md`, `docs/BACKUP_AND_DR.md` |
| CI workflow definition | Implemented | `.github/workflows/emdo-medical-api.yml` |
| Doctor verification state machine and fail-closed source gate | Implemented/tested | `verification-rules.spec.ts`; `provider-care.e2e-spec.ts` |
| Two-person human approval for verification | Implemented/tested | `approval.controller.ts`, `verification.service.ts`; e2e self-approval denial |
| Verified-only country-scoped provider directory | Implemented/tested | `directory.service.ts`; e2e hidden-unverified assertion |
| Availability slots and atomic appointment booking/cancellation | Implemented/tested | `appointment.service.ts`; e2e double-booking and slot-release assertions |
| Provider credential/appointment schema with RLS and append-only events | Implemented/tested | `002_provider_care.sql`; e2e audit assertions |
| Ten-agent AI registry with two enabled, safety-bounded agents | Implemented/tested | `agent-registry.ts`, `agent-registry.spec.ts`; e2e enabled/disabled/commercial assertions |
| Versioned, code-reviewed prompt registry with safety rules | Implemented/tested | `prompt-registry.ts`, `prompt-registry.spec.ts`; `GET /v1/ai/prompts` restricted to oversight roles |
| Offline model gateway with fail-closed production/configuration gate | Implemented/tested | `model-gateway.ts`, `model-gateway.spec.ts`; no network or provider call exists |
| AI permission envelope, consent/tenant context boundary and metadata-only sources | Implemented/tested | `permission.service.ts`, `context.service.ts`; e2e patient mismatch, consent denial and no-content assertions |
| Labelled AI responses with source references and no prompt retention | Implemented/tested | `assistant.service.ts`; e2e sentinel prompt never appears in responses, telemetry or audit |
| AI approval/escalation workflows with named humans and no autonomous execution | Implemented/tested | `workflow.service.ts`, `escalation.service.ts`; e2e self-approval denial and human resolution |
| Append-only AI telemetry, RLS-protected AI tables and PHI-safe audit | Implemented/tested | `003_ai.sql`, `ai-audit.service.ts`, `audit-sanitizer.spec.ts`; e2e audit assertions |
| Authenticated API-only AI metrics (no client dashboard) | Implemented/tested | `monitoring.service.ts`; e2e role denial and aggregate assertions |
| M10 versioned metric catalogue and report definitions | Implemented/tested | `metric-registry.ts`, `metric-registry.spec.ts`; 14 metrics, 9 report templates, no invented values |
| M10 least-privilege 12-role report matrix | Implemented/tested | `insight-permissions.ts`, `insight-permissions.spec.ts`; e2e group, country and employee record-access denial |
| M10 fixed aggregate query boundary | Implemented/tested | `insight-queries.ts`, `insight-queries.spec.ts`; no PHI tables, credential hashes, decrypted values or raw identifier output |
| M10 unavailable-source evidence and small-cell suppression | Implemented/tested | `insight.service.ts`, `insight.service.spec.ts`; e2e `UNAVAILABLE_NO_SOURCE`, null values and suppressed cells |
| M10 daily/weekly/monthly executive report generation | Implemented/tested | `insight.controller.ts`, `insight.service.ts`; e2e cadence, evidence fields and CEO final-authority note |
| M10 PHI-safe aggregate audit | Implemented/tested | `audit-sanitizer.spec.ts`; e2e `insight_report_generated` event with allowlisted metadata only |
| Super Admin signed HTTP-only session | Implemented/tested | `apps/admin/src/lib/session.ts`, `session.spec.ts`, login route spec; tamper/expiry/missing-secret rejection |
| Super Admin server-held API boundary | Implemented/tested | `apps/admin/src/lib/api.ts`, `api.spec.ts`, generate route spec; bearer token never reaches browser code or JSON bodies |
| Super Admin aggregate-only rendering | Implemented/tested | `sanitize.spec.ts`, `metric-card.spec.tsx`; unavailable/suppressed values never render as zero, PHI keys are dropped |
| Super Admin role-filtered client | Implemented/tested | `portal-nav.tsx`, shared role-group matrix; patient-only sessions rejected; API re-authorises every call |
| Super Admin report generation view | Implemented/tested | `report-generator.tsx`, report route spec; daily/weekly/monthly decision-support output with no export or approval control |
| Next.js production build | Implemented | `npm run build -w @emdo/admin`; 10 routes compiled with dynamic server rendering for authenticated views |

## 2. Test results recorded locally (2026-11-25)

- `npm run typecheck`: passed for shared API and portal workspaces.
- `npm run build`: passed, including `next build` for the Super Admin portal.
- `npm test`: 21 suites / 78 tests passed (shared: 1 suite / 4 tests; API: 13 suites / 48 tests; portal: 7 suites / 26 tests covering sessions, role-filtered navigation, routes, sanitizers, PHI-safe rendering and server-held API calls).
- `npm run test:e2e`: 4 suites / 13 tests passed against local PostgreSQL 16, including `ai-assist.e2e-spec.ts` and `insight.e2e-spec.ts`. The e2e setup loads `platform/.env` and honours `TEST_DATABASE_URL` (`emdo_test`), so test truncation never targets the development database.
- A generated `dist` directory was corrupted by environment restarts during the run and was rebuilt from source before the final test pass; no source file was recovered from generated output.

No hosted CI run is attached to this workspace. A green local run proves prototype gates only.

## 3. Module status

| ID | Module | State | Notes |
|---|---|---|---|
| M0 | Foundation | Prototype | Identity, RBAC/ABAC, consent, audit, tenancy, crypto |
| M1 | EMDO Record | Prototype | Encrypted FHIR-compatible entries and versioning |
| M2 | EMDO Care (verification + directory + appointments) | Prototype | Manual review only; no authoritative source; no verified-provider record access |
| M9 | EMDO Assist (offline AI foundation) | Prototype | Ten agents registered, two enabled; offline deterministic gateway; no external model, voice or translation provider |
| M10 | EMDO Insight (aggregate API) | Prototype | Versioned metrics and role-filtered reports; unavailable sources explicit; no financial ledger, incident source or live business metric claim |
| M10-CLIENT | Super Admin portal (Next.js) | Prototype | Signed server-held session and aggregate-only views; no PHI page, export, approval or sensitive operation |
| M3–M8 | Telehealth, Practice, Pharmacy, Labs, Family, Corporate | Design | Not implemented; no code or live integration |

The machine-readable register is `packages/shared/src/status.ts`.

## 4. Platforms status

| Platform | Status |
|---|---|
| Patient mobile app (Flutter) | Design — not started |
| Doctor mobile app (Flutter) | Design — not started |
| Clinic management portal (Next.js) | Design — not started |
| Hospital management portal (Next.js) | Design — not started |
| Pharmacy portal (Next.js) | Design — not started |
| Laboratory portal (Next.js) | Design — not started |
| Corporate enterprise portal (Next.js) | Design — not started |
| Super Admin dashboard (Next.js) | Prototype — local aggregate-only client implemented; not hosted |

All listed clinical and commercial portals remain Design. The only runnable client is the Super Admin prototype; the API remains the authoritative boundary.

## 5. Incomplete features and technical dependencies

| Gap | Impact | Dependency / next step |
|---|---|---|
| Authoritative verification source | Manual sandbox review cannot support production; verification fails closed | Contract and test a jurisdiction source per country |
| Verified-provider record access | Verification does not grant record access; clinical roles remain blocked | Separate clinical-governance decision and audited consultation workflow |
| Appointment completion/rescheduling and in-person facility model | Only confirm/cancel and channel flag are implemented | Clinical workflow and facility licensing decisions |
| MFA, rate limiting, device binding | Prototype auth insufficient for pilot | Identity hardening module |
| Emergency break-glass | Reserved consent purpose has no endpoint | Clinical governance policy + audited workflow |
| Full FHIR validation/terminology | Structural validation only | Adopt a conformant FHIR validator |
| Pagination and search | List endpoints capped only | Add cursor pagination and indexed search without PHI leakage |
| Key rotation | No re-wrap tooling | KMS adapter + versioned data keys |
| Retention/DSAR jobs | Documented, not implemented | Legal retention schedule per country |
| Notifications | No SMS/email/push | Country-specific providers and consented templates |
| Payments, pharmacy, labs, telemedicine and analytics | Not implemented | Separate modules, one at a time |
| M10 revenue, expense, retention, clinic, pharmacy, lab, incident and expansion sources | Explicitly unavailable with evidence; no estimate or zero is returned | Implement and test source modules M4–M8 plus finance/security ledgers; then revise metric definitions |
| M10 de-identification and privacy sign-off | Prototype suppresses small cells and blocks PHI tables; no formal review exists | Privacy engineering review and signed de-identification methodology before pilot |
| M10 sensitive export/approval endpoints | Design only; not implemented by D-025 | Separate owner decision and tested workflow before any export execution |
| Super Admin MFA, rate limiting and hosted deployment | Prototype uses password sign-in only and runs locally; no production session policy is proven | Identity hardening, deployment decision and security review before pilot |
| Super Admin portal de-identification/privacy sign-off | Prototype suppresses cells and renders evidence, but no formal review exists | Apply the same signed M10 de-identification methodology to client rendering |
| Super Admin export and sensitive operations | No export, approval, suspension or financial action control exists | Separate owner decision and tested named-human workflow |
| Approved model provider, DPA and data residency | AI gateway fails closed outside offline prototype | Owner decision, tested provider integration and contract before any pilot |
| AI safety evaluation and clinical governance | Prototype policy gates are tested, not clinically evaluated | Safety evaluation and signed governance before any clinical use |
| Voice and multilingual AI runtime | Design-only; no tested speech or translation provider | Separate decision and tested provider before implementation |
| Hosted environments | Provider-neutral staging manifests are prepared but no environment is provisioned or deployed (`STAGING.md`) | Infrastructure decision record, hosted secrets, TLS ingress, MFA, rate limiting and monitoring |
| Backup automation and restore evidence | Not implemented | `BACKUP_AND_DR.md` §5 |

## 6. Rules still binding

- No module may be marked complete until its automated tests pass and evidence is attached.
- No integration may be described as functional until tested.
- No mock or synthetic data may be used as production data.
- No patient record may be exposed to an unauthorised user.
- Clinical roles may not practise until verification exists.
- AI may not diagnose, prescribe, sign or approve clinical/financial actions.
- All decisions must be recorded in `../DECISION_LOG.md`.
- Passing tests do not promote a module beyond Prototype; M2 remains Prototype until the verification source and clinical-governance gates are signed, M9 remains Prototype until an approved tested model provider and AI safety evaluation exist, M10 and M10-CLIENT remain Prototype until de-identification review, privacy sign-off and trusted source modules exist.
