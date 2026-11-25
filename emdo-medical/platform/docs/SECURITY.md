# EMDO Medical — security and privacy documentation

> **Maturity: Prototype.** These controls are implemented and locally tested. They are not evidence of production readiness, penetration testing, certification, or legal compliance. No patient data may be used in this environment.

## 1. Security model

| Domain | Implemented control | Evidence |
|---|---|---|
| Transport | Helmet security headers; HSTS/CSP configuration available; TLS is terminated at the ingress in deployed environments (local HTTP is development-only) | `src/main.ts`, `docs/DEPLOYMENT.md` |
| Authentication | OIDC-style bearer tokens; scrypt password hashing (memory-hard, salted); opaque rotating refresh tokens stored only as HMAC hashes; account status check on login | `identity.service.ts`, `password.service.ts`, e2e tests |
| Authorisation | RBAC via `RequireRoles`; ABAC intersection of role, country, tenant, consent and assurance; deny-by-default guards; platform-admin bypass limited to audit/admin endpoints | `auth.guard.ts`, `permissions.guard.ts`, `country.guard.ts` |
| Tenant isolation | PostgreSQL `FORCE ROW LEVEL SECURITY` on all tenant tables; every request sets scoped `app.*` settings inside a transaction; missing context yields no rows | `001_foundation.sql`, `002_provider_care.sql`, `database.service.ts` |
| Consent | Purpose-specific, time-bound, revocable grants; fresh authentication required to create; scope restricted to supported FHIR resource types; every grant/revocation audited | `consent.service.ts`, e2e tests |
| Encryption at rest | AES-256-GCM envelope encryption with HKDF-derived per-tenant data keys; master key from environment/KMS boundary; integrity hash on every record | `crypto.service.ts`, e2e round-trip and tamper tests |
| PHI in logs | Audit metadata allowlist plus email/phone pattern redaction; exceptions return generic codes; no PHI in URLs, traces or error bodies; AI prompts and generated text are never stored or logged | `audit-sanitizer.ts`, `all-exceptions.filter.ts`, `assistant.service.ts`, e2e prompt-sentinel assertions |
| Append-only audit | `audit_events`, `verification_events` and `ai_interactions` have database triggers rejecting UPDATE and DELETE; identity, consent, record, verification, appointment and AI actions are recorded | `001_foundation.sql`, `002_provider_care.sql`, `003_ai.sql`, `audit.service.ts`, e2e tests |
| Validation | Strict DTO validation; unknown fields rejected; FHIR structure allowlist; AI principal rejected as clinical author | `main.ts`, `fhir.ts`, e2e test |
| Fail-closed country gate | Country profiles are data, not code; unusable/missing profiles deny authenticated access; production requires `approved` mode | `country-profile.service.ts`, `env.validation.ts` |
| Clinical role safety | Clinician, pharmacist and lab roles cannot read records; verification does not silently grant record access | `record.service.ts`, `provider-care.e2e-spec.ts` |
| Provider credentialing | Licence numbers and credential references are HMAC-hashed before storage; explicit state machine; `verified` reachable only through a named human approval; requester cannot approve their own review; fresh auth required; production fails closed without an authoritative tested source | `verification-rules.ts`, `verification.service.ts`, e2e tests |
| Provider directory | Only `verified` profiles in the token country are returned; no licence hash, credential reference, user ID or tenant ID is exposed | `directory.service.ts`, `provider-care.e2e-spec.ts` |
| Appointment safety | Verified provider and country required; atomic slot claim prevents double booking; no free-text reason stored; owner-only cancellation releases the slot | `appointment.service.ts`, `provider-care.e2e-spec.ts` |
| AI least privilege | Ten agents registered, only two enabled; policy envelope checks country, agent state, capability, role and data domain before gateway access; commercial agents have no patient identifiers or context budget | `agent-registry.ts`, `permission.service.ts`, e2e disabled/commercial assertions |
| AI PHI boundary | Patient context is own-tenant record metadata only; clinician drafts require an active scoped consent grant; no clinical content enters a response or telemetry row | `context.service.ts`, `model-gateway.ts`, `ai-assist.e2e-spec.ts` |
| AI egress | Single offline gateway; no network call or provider adapter; non-offline and production configurations fail closed | `model-gateway.ts`, `env.validation.ts`, `model-gateway.spec.ts` |
| AI human control | Draft approval and escalation require a named different human, fresh authentication and coded outcomes; no autonomous execution or AI approver principal | `workflow.service.ts`, `escalation.service.ts`, e2e self-approval denial |
| M10 least privilege | 12-role report-group matrix; no employee role gains record access; `platform_admin` remains separate from `super_admin`; country scope enforced for non-super-admin roles | `insight-permissions.ts`, `insight-permissions.spec.ts`, e2e role/country denial |
| M10 de-identified boundary | Only fixed parameterised aggregate SQL; no PHI table, decryption, credential hash, consent grant or raw identifier can be selected; no caller-supplied query builder | `insight-queries.ts`, `insight-queries.spec.ts` |
| M10 evidence integrity | Absent sources return `UNAVAILABLE_NO_SOURCE` with null values; small cells below 10 are suppressed; no estimated or vendor metric is rendered | `metric-registry.ts`, `insight.service.ts`, e2e evidence and suppression assertions |
| M10 audit | Report generation writes `insight_report_generated` with allowlisted report IDs, cadence, period and country only; no report content or prompts are stored | `audit-sanitizer.spec.ts`, `insight.e2e-spec.ts` |
| Portal session boundary | HMAC-signed HTTP-only session cookie, constant-time verification, short expiry, `Secure` in production, refresh token discarded, missing secret fails closed | `apps/admin/src/lib/session.ts`, `session.spec.ts`, login route spec |
| Portal API boundary | Browser code never receives the Insight token; server components and route handlers re-send it to the API, which remains the only authoriser | `apps/admin/src/lib/api.ts`, `api.spec.ts`, generate route spec |
| Portal PHI-safe rendering | Allowlisted response copier; no patient-record page; unavailable and suppressed cells must have null values and are labelled explicitly | `sanitize.spec.ts`, `metric-card.spec.tsx` |
| Secrets | No secrets committed; `.env` and `.env.local` gitignored; placeholders rejected at startup; separate access/refresh signing keys and a separate portal cookie secret | `.env.example`, `env.validation.ts`, `SUPER_ADMIN_PORTAL.md` |

## 2. Key management

- `DATA_ENCRYPTION_KEY` is a base64-encoded 32-byte master key. It must be supplied by a secret manager or KMS in deployed environments; this prototype reads it from the environment.
- Per-tenant keys are derived with HKDF-SHA256 using the tenant ID as salt and a versioned info string (`emdo-record-v1`).
- Key rotation requires re-wrapping records under a new version; **rotation tooling is not implemented** and is a production dependency.
- Refresh tokens, identifier lookups and credential references use HMAC with the master key; they are irreversible and contain no recoverable cleartext.

## 3. Threat model summary

| Threat | Mitigation | Residual gap |
|---|---|---|
| Stolen database snapshot | Tenant-derived AES-GCM encryption of record bodies; hashed identifiers and credential references | Encryption keys must be separated from DB backups in production |
| Cross-tenant record access | RLS + consent service + application checks | Fine-grained scope enforced in app, not in RLS policy |
| Privileged insider misuse | Append-only audit, role restrictions, separate platform role, two-person verification approval | No SIEM/alerting correlation yet |
| Credential stuffing | Strong password policy, scrypt, refresh rotation | No rate limiting, CAPTCHA or device binding yet |
| Consent abuse | Fresh auth, expiry, revocation, purpose + scope | No emergency break-glass workflow yet |
| Fake or unverified provider | Manual review queue, hashed evidence references, verified-only directory, no record privilege from verification alone | No authoritative registry integration; production verification is blocked until one is contracted and tested |
| Reviewer self-approval | Requester and approver must be different user IDs; fresh auth and append-only events | No separation-of-duties policy engine or delegated approval workflow |
| Appointment enumeration or double booking | Country-scoped verified directory, atomic slot claim, owner-only list/cancel | No rate limiting; no facility/address model for in-person visits |
| PHI in appointment metadata | No reason/free-text field; audit metadata limited to IDs and channel | Appointment linkage itself is personal data and needs a retention schedule |
| AI writing clinical content | AI author rejected; AI output is a labelled non-clinical draft or source-reference answer; no diagnosis, prescription, result change or signature | No clinical safety evaluation or governance sign-off yet |
| PHI leakage into AI telemetry or commercial workloads | Allowlisted audit keys, no prompt/text columns, metadata-only source references, commercial agents disabled with zero context budget | No DLP tooling or formal privacy engineering review yet |
| Unapproved model egress | Single offline gateway with fail-closed configuration validation | No tested provider, DPA, residency decision or output filtering evaluation |
| AI self-approval or autonomous action | Different named human required; fresh auth; coded decisions; approval returns `executed: false` | No delegated approval policy engine or SIEM correlation |
| Executive dashboard PHI exposure | M10 uses fixed aggregate queries, 12-role matrix and no row-level endpoints; Super Admin cannot read patient records; the portal renders only sanitized aggregate responses | No signed de-identification review or privacy engineering sign-off yet |
| Portal session theft | Signed HTTP-only cookie, `SameSite=Lax`, `Secure` in production, short expiry and no browser-held token | No MFA, rate limiting, session revocation list or hosted cookie-domain review |
| Client-side response injection | Portal sanitizers copy only allowlisted fields and refuse numeric values on unavailable/suppressed cells | No hosted CSP review, DLP tooling or penetration test |
| Invented executive metrics | Evidence status is part of every metric; missing sources return `UNAVAILABLE_NO_SOURCE` and null values | Source modules M4–M8, finance and incident ledgers do not exist |
| Small-cell re-identification | Minimum group size 10; suppressed values are null; no totals are returned for grouped metrics | Complementary suppression and longitudinal linkage need formal privacy review |
| Injection / malformed input | Parameterised SQL, strict DTO validation | No WAF rules or DAST run yet |
| Secrets leakage | Gitignored env, placeholder rejection, PHI-safe logs | No secret-scanning CI yet |

## 4. Required before pilot

1. Independent penetration test with critical/high findings closed.
2. MFA for privileged and clinical accounts; rate limiting and account lockout.
3. KMS-backed key storage and documented rotation procedure.
4. DPIA for the launch country and clinical content set.
5. Authoritative provider verification source contracted and tested per country; manual-only verification must not be used in production.
6. Signed clinical governance decision on any future verified-provider record access, consultation notes and telehealth.
7. Pharmacy and laboratory verification services implemented and tested.
8. Backup/restore drill and incident-response exercise with evidence.
9. Retention and DSAR jobs (currently documented, not implemented).
10. Approved, tested model provider with DPA, residency decision and egress controls before any AI pilot; the offline prototype must remain fail-closed outside non-clinical development/test.
11. AI safety evaluation and signed clinical governance covering labels, source attribution, human approval and prohibited actions.
12. Signed M10 de-identification methodology, privacy sign-off and trusted source modules; no executive metric with an absent source may be promoted to a measured claim.
13. Portal deployment review covering MFA, rate limiting, session revocation, cookie domain, hosted TLS/CSP and no persistent report storage; the local prototype must not be exposed publicly.

## 5. Explicitly not claimed

No SOC 2 / ISO 27001 / PCI DSS certification, no HIPAA equivalence, no regulator approval, no security audit, no measured availability, no production incident history, and no functional registry, pharmacy, laboratory, payment, external AI model/voice/translation or executive business-intelligence source integration is claimed by this repository. No hosted Super Admin portal, MFA or privileged-session revocation system is claimed. No revenue, expense, clinic, pharmacy, laboratory, incident, retention or expansion metric is presented as measured EMDO performance.
