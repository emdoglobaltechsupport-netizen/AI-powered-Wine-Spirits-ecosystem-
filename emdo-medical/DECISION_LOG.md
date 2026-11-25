# EMDO MEDICAL — Decision Log and ADR Register

> **Status: all decisions below are PROPOSED and await project owner approval.**
> **No code may be written until the owner approval record is completed.**
> This log exists to satisfy constitution rule C8: every development decision is documented.

---

## 1. Status definitions

| Status | Meaning |
|---|---|
| **Proposed** | Documented, reasoned, not approved. No implementation permitted. |
| **Approved** | Owner has signed with date and scope. Implementation of that decision may begin. |
| **Superseded** | Replaced by a newer decision; the old record is retained. |
| **Rejected** | Considered and declined; rationale retained. |

Approval requires: approver name, date, decision IDs covered, and any conditions. Approval of this specification is recorded in §4.

---

## 2. Decision records

### D-001 — Documentation-first, code-later

- **Status:** Proposed
- **Decision:** No source code, schema, infrastructure, or prototype is created before owner approval of the master specification and this log.
- **Rationale:** The project owner explicitly required architecture and requirements review before coding; healthcare safety makes premature implementation costly.
- **Alternatives considered:** Build a prototype in parallel to accelerate learning (rejected: violates owner instruction and creates unlabelled claims).
- **Owner:** Project Owner
- **Evidence:** This log; master specification §0 and §15 Phase 0.

### D-002 — Record-first product anchor

- **Status:** Proposed
- **Decision:** EMDO Record is the foundational module; discovery, appointment, pharmacy, lab and subscription modules depend on it.
- **Rationale:** A governed longitudinal record differentiates the ecosystem and supports continuity across fragmented African care pathways.
- **Alternatives considered:** Marketplace-first (rejected: weak continuity and weak consent model); subscription-first (rejected: benefits require underlying services).
- **Owner:** Product Architecture

### D-003 — Country as a first-class tenant dimension

- **Status:** Proposed
- **Decision:** Jurisdiction is an enforced scope in identity, data, licensing, pricing and AI configuration, not a UI filter.
- **Rationale:** Licensing, residency, payment methods and law differ by country; a single global pool would create legal and clinical failures.
- **Alternatives considered:** Single global tenant with country tags (rejected: cannot fail closed reliably).
- **Owner:** Architecture

### D-004 — Data residency before scale

- **Status:** Proposed
- **Decision:** Identifiable health data remains in the configured country residency zone; global plane holds metadata and de-identified aggregates only.
- **Rationale:** African data-protection regimes increasingly restrict cross-border health data flows.
- **Alternatives considered:** Central global database (rejected: residency and legal risk).
- **Owner:** Architecture + Privacy

### D-005 — Verification gate for clinicians

- **Status:** Proposed
- **Decision:** Only providers with `verified` status from an authoritative jurisdiction source may be listed or provide care; verification expiry suspends access.
- **Rationale:** Mandatory rule C3; prevents unauthorised practice.
- **Alternatives considered:** Self-declaration with post-review (rejected: patients would see unverified providers).
- **Owner:** Clinical Governance + Compliance

### D-006 — Pharmacy and lab licensing gates

- **Status:** Proposed
- **Decision:** Pharmacy and lab onboarding requires validated licence, site and responsible professional checks; checks repeat at order/release time.
- **Rationale:** Mandatory rules C4 and C7.
- **Alternatives considered:** Onboarding-only check (rejected: expiry and site changes create risk).
- **Owner:** Compliance

### D-007 — AI is administrative and assistive only

- **Status:** Proposed
- **Decision:** AI may draft and classify but never diagnose, prescribe, sign, release results, or approve financial/clinical actions. Allowlist/denylist is policy-enforced.
- **Rationale:** Mandatory rule C5.
- **Alternatives considered:** AI-assisted triage with autonomy (rejected: clinical risk and rule violation).
- **Owner:** Product + Clinical Safety

### D-008 — Human approval for class B and C actions

- **Status:** Proposed
- **Decision:** Named human approval with reason, timestamp and evidence is required for sensitive administrative and all clinical/regulated actions.
- **Rationale:** Mandatory rule C7.
- **Alternatives considered:** Automatic approval for low-risk financial thresholds (deferred; may be proposed later with limits and audit).
- **Owner:** Compliance + Finance + Clinical Governance

### D-009 — No invented credentials, partners, testimonials or metrics

- **Status:** Proposed
- **Decision:** All public claims require an evidence record; all model figures are labelled planning assumptions; no named partner without signed document.
- **Rationale:** Mandatory rules C1 and C2.
- **Alternatives considered:** Use indicative partner names for credibility (rejected: fabrication).
- **Owner:** Product + Legal

### D-010 — Clean-room use of business-model references

- **Status:** Proposed
- **Decision:** Eka Care, Practo and Tata 1mg are studied only as public business-model archetypes; no code, UI, copy, data or protected expression is reused.
- **Rationale:** Mandatory rule C10 and IP risk.
- **Alternatives considered:** Direct feature cloning for speed (rejected: IP and differentiation risk).
- **Owner:** Product + Legal

### D-011 — Subscriptions are not insurance

- **Status:** Proposed
- **Decision:** Consumer and corporate plans are benefits/access subscriptions, not insurance policies, unless a licensed entity and legal approval exist.
- **Rationale:** Avoids unlicensed insurance activity; aligns with risk R18.
- **Alternatives considered:** Position as health insurance to improve perceived value (rejected: illegal without licence).
- **Owner:** Legal + Business

### D-012 — No referral kickbacks

- **Status:** Proposed
- **Decision:** Fees are for platform services and completed fulfilment, never for clinical referral or ranking; sponsored placement is labelled and excluded from clinical ranking.
- **Rationale:** Anti-bribery and patient-trust risk; risk R14.
- **Alternatives considered:** Paid priority doctor listings (rejected: conflict with clinical neutrality).
- **Owner:** Commercial + Compliance

### D-013 — Android-first, low-bandwidth clients

- **Status:** Proposed
- **Decision:** First mobile client prioritises Android, offline record capture and compressed uploads; USSD/SMS/voice are design targets per country.
- **Rationale:** Device and network reality in many African markets; requirement §8.3.
- **Alternatives considered:** iOS-first (rejected: market fit assumption to be validated by owner).
- **Owner:** Product + Engineering

### D-014 — De-identified analytics only

- **Status:** Proposed
- **Decision:** BI and external data products use de-identified, aggregated datasets with small-cell suppression; BI roles cannot join to PHI tables.
- **Rationale:** Privacy by design; risk R06/R09.
- **Alternatives considered:** Identifiable dashboards with strong access control (rejected: unnecessary exposure).
- **Owner:** Data + Privacy

### D-015 — Phased country activation

- **Status:** Proposed
- **Decision:** Countries activate one at a time through a documented gate; no blanket multi-country launch.
- **Rationale:** Legal, licensing and residency differences; requirement §9.4.
- **Alternatives considered:** Simultaneous regional launch (rejected: unmanageable compliance variance).
- **Owner:** Owner + Legal + Clinical

### D-016 — Exclude controlled substances initially

- **Status:** Proposed
- **Decision:** Controlled medicines are out of scope until a dedicated country-specific legal opinion and control system are approved.
- **Rationale:** Risk R24.
- **Alternatives considered:** Include with basic restrictions (rejected: high legal risk).
- **Owner:** Legal + Pharmacy Governance

### D-017 — No advertising revenue until policy approved

- **Status:** Proposed
- **Decision:** Financial model assumes no ad revenue until a compliant advertising policy is approved; health claims and prescription-medicine ads restricted.
- **Rationale:** Risk R15 and patient trust.
- **Alternatives considered:** Include ad revenue in base case (rejected: unvalidated and regulated).
- **Owner:** Commercial + Legal

---

## 2.1 Implementation decisions recorded during the first build

These are technical choices inside the owner-approved scope (Foundation + EMDO Record, country-agnostic core). They are recorded here to satisfy rule C8.

### D-018 — Raw `pg` with SQL migrations instead of an ORM

- **Status:** Approved within approved scope (2026-11-25)
- **Decision:** Use the `pg` driver, explicit SQL migrations and repository methods rather than TypeORM/Prisma for the foundation.
- **Rationale:** Direct control over `FORCE ROW LEVEL SECURITY`, transaction-local settings, JSONB/FHIR storage and tenant-derived encryption; fewer dependencies.
- **Alternatives considered:** TypeORM (rejected for this module: weaker control of RLS context and generated SQL); Prisma (rejected: RLS and raw migration control less direct).
- **Owner:** Senior Full-Stack Engineering Team

### D-019 — Built-in scrypt for password hashing

- **Status:** Approved within approved scope (2026-11-25)
- **Decision:** Use Node `crypto.scrypt` with random salt and memory-hard parameters; no native password-hashing dependency.
- **Rationale:** Avoids native build risk on target environments while providing memory-hard hashing; cost is configurable and validated.
- **Alternatives considered:** Argon2/bcrypt native packages (deferred pending dependency review).

### D-020 — `ts-node` for runtime scripts, `ts-jest` for tests

- **Status:** Approved within approved scope (2026-11-25)
- **Decision:** Run migrations/bootstrap/dev through `ts-node`, not `tsx`/esbuild-only tooling.
- **Rationale:** NestJS dependency injection requires emitted decorator metadata; esbuild does not emit `design:paramtypes`, which caused constructor injection to fail. `ts-jest` correctly emits metadata for tests.
- **Owner:** Senior Full-Stack Engineering Team

### D-021 — First build scope: foundation + EMDO Record only

- **Status:** Approved within approved scope (2026-11-25)
- **Decision:** Implement identity, RBAC/ABAC, consent, audit, country config, crypto and encrypted FHIR-compatible records before any other module or client application.
- **Rationale:** Every other module depends on identity, consent and record primitives; owner selected this module first.
- **Alternatives considered:** Parallel client builds (rejected by "one module at a time" instruction).

### D-022 — Second build scope: doctor verification + EMDO Care

- **Status:** Approved by owner instruction (2026-11-25)
- **Decision:** Implement the provider credentialing state machine, human approval workflow, verified-only provider directory, availability and appointment booking. No real registry integration, no invented credentials, no cross-border practice assumption.
- **Rationale:** Owner instructed "go ahead next module"; verification is the hard gate that makes discovery safe.
- **Alternatives considered:** Building telemedicine or pharmacy first (rejected: both depend on verified providers).
- **Safety constraint:** The verification adapter is manual-review-only until an authoritative source is contracted and tested per country. Production fails closed without one.
- **Owner:** Project Owner / Senior Full-Stack Engineering Team

### D-023 — Third build scope: M9 EMDO Assist central AI foundation

- **Status:** Approved by owner decisions in session (2026-11-25)
- **Decision:** Implement the central AI intelligence layer as module M9 only: agent registry, policy/permission envelope, versioned prompt management, offline model gateway interface, AI approval/escalation workflow, append-only AI audit, and authenticated API metrics. Register all ten AI departments as named agents, but enable only safety-bounded text interaction for the Patient Assistant and Doctor Documentation Assistant. Pharmacy, Laboratory, Clinic Operations, Customer Support, Finance, Marketing, Compliance and CEO agents are registry entries in Design state until their source modules and data boundaries exist.
- **Owner answers captured in this session:**
  - Scope: **M9 foundation first**, not a cross-module rollout.
  - Model backend: **offline prototype** — no external model/provider calls; deterministic policy-safe responses only; no provider contract, region or capability claimed.
  - Monitoring: **API metrics endpoints plus design documentation**; no Next.js dashboard in this module.
  - Voice/language: **design-only** — capability interfaces and policy recorded; text-only English prototype; no speech/translation integration claimed.
- **Rationale:** The AI layer is cross-cutting, but the project rule is one module at a time. A fail-closed offline gateway proves policy, audit, approval and isolation controls without creating unverified clinical or commercial integrations.
- **Safety constraints:** AI may not diagnose, prescribe, change laboratory results, sign, approve or make final clinical/financial decisions. Clinical outputs must be labelled non-final and require clinician review where relevant. Patient information is isolated from commercial AI workloads; PHI access is consent- and role-scoped through existing record controls. Production model calls remain blocked until a provider, residency terms, tests and a signed governance decision exist.
- **Alternatives considered:** All ten departments live now (rejected: relies on unbuilt modules and violates one-module-at-a-time); live model provider now (rejected: no approved provider/DPA/residency decision); client dashboard now (rejected: second workstream); voice now (rejected: no tested provider).
- **Owner:** Project Owner / Senior Full-Stack Engineering Team

### D-024 — Fourth build scope: M10 Insight / Super Admin executive dashboard design

- **Status:** Approved for design only by owner decisions in session (2026-11-25)
- **Decision:** Prepare a design-only architecture for the central management and executive dashboard: M10 aggregate business-intelligence API, Next.js Super Admin information architecture, a 12-role catalogue with a least-privilege permission matrix, versioned metric definitions, sensitive-operation approval workflows, and daily/weekly/monthly CEO report templates. No application code, database migration, client implementation, external integration or metric claim is authorised by this decision.
- **Owner answers captured in this session:**
  - Scope: **design + D-024 first**; no implementation is authorised by this decision.
  - Missing data: **unavailable with evidence** — metrics whose source module does not exist must return an explicit `UNAVAILABLE_NO_SOURCE` status; no zero, estimate, vendor figure or invented trend.
  - Roles: **add canonical roles** and a versioned, least-privilege permission matrix; do not collapse them into `platform_admin`.
- **Rationale:** The request spans M10, a new Next.js platform, and unbuilt M4–M8 finance/clinical/facility sources. Design first preserves the one-module-at-a-time rule and prevents untested integrations or fabricated executive metrics.
- **Safety constraints:** No employee role gains patient-record access; clinical roles remain blocked from records until a separate governance decision. Sensitive financial, clinical, suspension and export actions require named human approval with requester/approver separation and fresh authentication. AI may not approve, sign or make a final strategic, financial or clinical decision. The CEO retains final authority over strategic business decisions but may not bypass clinical, legal, privacy or financial-control gates.
- **Alternatives considered:** Immediate backend and client build (rejected: multiple workstreams and unbuilt sources); mapping all roles to existing roles (rejected: loses least privilege and separation of duties); reporting zero or estimated values for absent sources (rejected: invented metrics); employee PHI access through dashboards (rejected: prohibited).
- **Evidence:** `platform/docs/EXECUTIVE_DASHBOARD_DESIGN.md`
- **Owner:** Project Owner / Senior Full-Stack Engineering Team

### D-025 — Fifth build scope: M10 Insight aggregate API implementation

- **Status:** Approved by owner instruction "Go ahead" in session (2026-11-25)
- **Decision:** Implement module M10 as a backend aggregate API only. The work is bounded to the versioned metric catalogue, aggregate metric and report endpoints, role/permission enforcement for the 12-role catalogue, explicit `UNAVAILABLE_NO_SOURCE` evidence responses, approval workflow design already documented, and PHI-safe audit. No Next.js Super Admin client, external integration, database-backed financial source, data seeding or live business metric claim is authorised.
- **Relationship to D-024:** D-024 remains the approved design. This decision authorises only the first implementation step stated in that design: the M10 aggregate API.
- **Rationale:** The owner's "Go ahead" followed the explicit statement that the next step was M10 aggregate API first, with the Super Admin portal as a separate authorised workstream.
- **Safety constraints:** The API reads de-identified aggregate values only; it must not expose row-level PHI, clinical record content, raw identifiers or decrypted payloads. Missing sources return explicit evidence status and never zero, estimates or trends. No role gains medical-record access. Sensitive report export and administrative operations retain the documented named-human approval workflow and are not executed by this module unless separately implemented and tested.
- **Alternatives considered:** Building the Next.js portal now (rejected: separate workstream); reporting unavailable domains as zero (rejected: invented metrics); adding all 12 roles without tests (rejected: least privilege must be proven); widening M9 or record APIs with business metrics (rejected: module boundary).
- **Evidence:** `platform/apps/api/src/insight/`; `platform/apps/api/test/insight.e2e-spec.ts`; `platform/docs/IMPLEMENTATION_STATUS.md`. Local gates passed: typecheck, build, 14 unit suites / 52 tests, 4 e2e suites / 13 tests.
- **Owner:** Project Owner / Senior Full-Stack Engineering Team

### D-026 — Sixth build scope: Super Admin Next.js portal implementation

- **Status:** Approved by owner instruction "Next" with two scope answers in session (2026-11-25)
- **Decision:** Implement the separately authorised Next.js Super Admin portal against the tested M10 aggregate API. Scope is limited to authenticated access, role-filtered navigation, metric and report views, explicit unavailable/evidence states, small-cell suppression display, PHI-safe rendering and prototype status labelling. No new source module, financial ledger, patient-record page, clinical approval, export execution or sensitive-operation execution is authorised.
- **Owner answers captured in this session:**
  - Workstream: **Super Admin portal**.
  - Depth: **implementation**, not design-only.
- **Rationale:** D-024 designed the portal and D-025 completed the aggregate API. The owner selected the portal as the next workstream after that API was tested.
- **Safety constraints:** The portal must render only aggregate API responses; it must not query or display PHI, record content, raw identifiers, prompts or generated clinical text. Role-filtered navigation is a usability aid and does not replace API enforcement. Unavailable metrics must be visibly labelled with evidence status and must never be rendered as zero, estimates or trends. No credential, patient, revenue, incident or partnership claim may be seeded into the UI as production data.
- **Alternatives considered:** M3 Telehealth, M4 Practice and hardening gates (not selected by owner); design-only portal (rejected: owner chose implementation); building new business sources now (rejected: separate modules and one workstream at a time); client-side-only role checks (rejected: API must remain authoritative).
- **Evidence:** `platform/apps/admin/src/`; `platform/docs/SUPER_ADMIN_PORTAL.md`; `platform/docs/IMPLEMENTATION_STATUS.md`. Local gates passed: typecheck, build (including Next.js production build), 21 unit suites / 78 tests, 4 API e2e suites / 13 tests. Portal remains Prototype; no hosted deployment or privacy sign-off exists.
- **Owner:** Project Owner / Senior Full-Stack Engineering Team

---

## 3. ADR register (architecture decisions to be written)

These ADRs are planned, not written. Each will be created only after owner approval of the related decision.

| ADR | Topic | Linked decision | Status |
|---|---|---|---|
| ADR-0001 | Tenancy and country partitioning model | D-003, D-004 | Planned |
| ADR-0002 | Patient identity and assurance levels | D-005, §8.4 | Planned |
| ADR-0003 | Consent and purpose enforcement | D-004, D-008 | Planned |
| ADR-0004 | Clinical record storage and versioning | D-002 | Planned |
| ADR-0005 | PHI-safe logging and auditing | D-014 | Planned |
| ADR-0006 | AI gateway, allowlist and model registry | D-007 | Planned |
| ADR-0007 | Payment scope reduction and ledger | D-008, D-011 | Planned |
| ADR-0008 | Verification adapter pattern | D-005, D-006 | Planned |
| ADR-0009 | Health data interoperability format | D-002 | Planned |
| ADR-0010 | De-identification pipeline | D-014 | Planned |

---

## 4. Owner approval record

> Complete this section only when the project owner has reviewed and approved the specified scope.

| Field | Value |
|---|---|
| Approval status | **APPROVED** |
| Approver name | Project Owner (confirmed via explicit approval in session, 2026-11-25) |
| Approver role | Project Owner |
| Date | 2026-11-25 |
| Decision IDs approved | D-001 to D-017 |
| Scope approved | Master specification v0.1; decisions D-001 to D-017 |
| Conditions | Build one module at a time; first module is Foundation + EMDO Record; country-agnostic core only (no country activated); maturity states and evidence rules from the specification remain binding; no module marked complete until tested |
| Allowed next action after approval | Begin Phase 0 foundation work and write listed ADRs; implement Foundation + EMDO Record |
| Explicitly still prohibited | Live clinical activity, real patient data, unverified providers, unlicensed pharmacy/lab operations, autonomous AI clinical action, public launch claims |

**Owner sign-off statement:**
"I have reviewed the EMDO Medical master specification and decision log. I approve the scope recorded above and authorise only the next actions listed. All other activity remains blocked."

**Implementation directives accepted with approval:** Flutter for mobile apps, Next.js for web apps, NestJS + TypeScript for backend services, PostgreSQL, FHIR-compatible structures, secure APIs, encryption at rest and in transit, automated testing, backups and disaster recovery, API documentation, country-specific configuration, and development/staging/production environments.

### 4.1 Subsequent explicit owner instructions

| Date | Instruction | Decisions recorded | Scope authorised |
|---|---|---|---|
| 2026-11-25 | "Go ahead next module" | D-022 | Doctor verification + EMDO Care |
| 2026-11-25 | AI engine architect role and four scope answers | D-023 | M9 EMDO Assist central AI foundation only, offline prototype, API metrics, voice/language design-only |
| 2026-11-25 | Super Admin / executive dashboard architect request and three scope answers | D-024 | M10 Insight and Super Admin dashboard design only; unavailable-with-evidence metrics; canonical roles with permission matrix; no code authorised |
| 2026-11-25 | "Go ahead" after stated next step | D-025 | M10 aggregate API implementation only; no Next.js portal, external integration or business metric claim |
| 2026-11-25 | "Next" plus Super Admin portal implementation answers | D-026 | Next.js Super Admin portal implementation against tested M10 API; no new source modules or PHI |

These instructions are in addition to, and do not widen, the original approval conditions in §4. All other decisions remain Proposed unless explicitly recorded as Approved.

---

## 5. Change control

1. Any change to rules C1–C10 requires re-approval of the master specification by the owner.
2. Any change to clinical authority, residency, pricing claims, or launch status requires a new decision record and two-person review.
3. Regulated claims require legal/clinical review; financial claims require finance review.
4. A documentation change never promotes a module from Design to Prototype, Pilot or Production.
5. Superseded decisions stay in this log with their reason and replacement ID.
