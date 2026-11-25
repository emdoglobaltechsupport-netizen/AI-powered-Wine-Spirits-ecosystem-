# EMDO MEDICAL — MASTER PRODUCT SPECIFICATION

> **Document status: DESIGN STATE — AWAITING PROJECT OWNER REVIEW AND APPROVAL**
> **Launch status: NO-GO FOR PUBLIC LAUNCH. NO CODE MAY BE WRITTEN UNTIL APPROVAL IS RECORDED.**
> **Version 0.1 (draft for approval) · Effective 2026-11-25 · Owner: Project Owner (unnamed)**
>
> This document is a specification, not a claim of existence. No module described here is built, licensed, staffed, certified, partnered, or live. Every number in this document is an explicitly labelled planning assumption — not reported performance, not a market fact, not investor evidence. No doctor, pharmacy, laboratory, hospital, patient, or testimonial is represented as real.

---

## 0. How to read this document

| Label | Meaning |
|---|---|
| **Design** | Specified only. No runnable artifact, no live effect. Current state of every EMDO capability. |
| **Prototype** | Local, non-production simulation with synthetic data and no external side effects. Not yet reached. |
| **Pilot** | Restricted live operation with verified, licensed providers and named operators under controlled conditions. Not yet reached. |
| **Production** | Public live operation after recorded security, clinical, legal and reliability evidence plus explicit owner approval. Not yet reached. |
| **Planning assumption** | Unvalidated input for modelling. Not evidence, not a forecast with statistical basis, not a promise. |
| **To be confirmed (TBC)** | Requires country-specific legal, clinical or commercial validation before activation. |

**Approval gate:** this document, the [Decision Log](./DECISION_LOG.md) and the [README](./README.md) must be reviewed and approved by the project owner. Approval is recorded in `DECISION_LOG.md` with date, approver and scope. Until then, all decisions are **Proposed** and all build activity is prohibited.

**Change control:** any change to module scope, clinical safety rules, data residency, AI authority, pricing claims, or launch status requires a new decision record plus two-person review (specification owner + a distinct approver); regulated claims additionally require qualified legal/clinical review. Documentation changes never promote a module's maturity state.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Non-negotiable product constitution](#2-non-negotiable-product-constitution)
3. [Reference boundary and market archetypes](#3-reference-boundary-and-market-archetypes)
4. [Target users and permissions](#4-target-users-and-permissions)
5. [Product requirements: module definitions](#5-product-requirements-module-definitions)
6. [End-to-end user journeys](#6-end-to-end-user-journeys)
7. [Subscription and revenue model](#7-subscription-and-revenue-model)
8. [African market localisation requirements](#8-african-market-localisation-requirements)
9. [Multi-country architecture](#9-multi-country-architecture)
10. [Technical blueprint](#10-technical-blueprint)
11. [Integrations and API catalogue](#11-integrations-and-api-catalogue)
12. [Security and privacy requirements](#12-security-and-privacy-requirements)
13. [Legal and clinical risk register](#13-legal-and-clinical-risk-register)
14. [Financial assumptions](#14-financial-assumptions)
15. [Phased implementation roadmap](#15-phased-implementation-roadmap)
16. [Launch-readiness checklist](#16-launch-readiness-checklist)
17. [Open questions requiring owner decision](#17-open-questions-requiring-owner-decision)
18. [Appendix A — canonical vocabulary and data objects](#appendix-a--canonical-vocabulary-and-data-objects)

---

## 1. Executive summary

### 1.1 Vision

EMDO Medical is a planned, AI-assisted healthcare ecosystem for African markets. It intends to connect a person's longitudinal health record, verified clinicians, licensed pharmacies and accredited laboratories, clinic and hospital operations, family and employer healthcare plans, administrative automation and business intelligence in one governed platform.

### 1.2 Product thesis

Healthcare in many African markets is fragmented across paper records, messaging apps, cash payments, informal providers and cross-border family care. EMDO's thesis is that a **governed record plus verified providers plus licensed fulfilment** creates more value than any single standalone service. The record is the anchor; marketplaces and subscriptions are the distribution; AI is the administrative glue — never the clinician.

### 1.3 What EMDO will not be

- Not a substitute for a licensed healthcare provider, pharmacy, laboratory, insurer, or emergency service.
- Not a source of diagnosis, prescription, or clinical assurance generated autonomously by AI.
- Not a referral-fee or kickback broker. No payment may influence clinical referral or product recommendation.
- Not an aggregator of unverified practitioners or unlicensed medicine sellers.
- Not a claimant of any partnership, credential, certification, testimonial, or outcome that has not been independently verified and documented.

### 1.4 Module map

| ID | Module | Purpose | Current state |
|---|---|---|---|
| M1 | **EMDO Record** | Longitudinal personal and clinical health records with consent control | Design |
| M2 | **EMDO Care** | Verified doctor discovery, profile, availability, appointment booking | Design |
| M3 | **EMDO Telehealth** | Synchronous/asynchronous consultation between verified clinician and patient | Design |
| M4 | **EMDO Practice** | Clinic and hospital administration, scheduling, clinical documentation, billing | Design |
| M5 | **EMDO Pharmacy** | Licensed pharmacy marketplace, medicine catalogue, order verification and fulfilment | Design |
| M6 | **EMDO Labs** | Licensed diagnostic laboratory marketplace, test ordering, sample logistics, results | Design |
| M7 | **EMDO Family** | Patient, family and household subscriptions and dependent management | Design |
| M8 | **EMDO Corporate** | Employer-sponsored healthcare benefits administration | Design |
| M9 | **EMDO Assist** | AI-assisted healthcare administration with mandatory human approval | Design |
| M10 | **EMDO Insight** | Access-controlled healthcare business intelligence on de-identified data | Design |

### 1.5 Delivery sequence (summary)

Phase 0 Owner approval and foundations → Phase 1 Design/Prototype (closed, synthetic data) → Phase 2 Single-country restricted pilot → Phase 3 Multi-country expansion → Phase 4 Production-scale operation. Each phase has explicit exit gates in §15. No phase may be skipped or partially satisfied.

---

## 2. Non-negotiable product constitution

These rules are inherited by every module, API, interface, roadmap item and decision record. A design that conflicts with this section is rejected, not negotiated.

| ID | Rule | Enforcement mechanism |
|---|---|---|
| C1 | **Never invent medical credentials or healthcare partnerships.** Provider credentials must be verified against an authoritative source for the relevant jurisdiction before any patient-facing listing or clinical action. Partnerships require a signed, dated record and legal review before any claim. | Credentialing service is a hard gate; claim registry blocks unverified names; no named organisation appears in marketing without a document reference. |
| C2 | **Never use fake testimonials or performance metrics.** All figures are labelled "planning assumption (unvalidated)" or "measured" with an evidence record. Testimonials require identifiable, consented, verified source and publication approval. | Financial assumptions register; claim review workflow; no outcome statistics in UI without evidence ID. |
| C3 | **Never permit unverified doctors to practise through the platform.** Verification status enum: `unverified → submitted → under_review → verified → suspended → revoked`. Only `verified` may see patients, prescribe where lawful, or sign records. | Fail-closed authorisation on every clinical endpoint; daily re-verification job; immediate suspension on registry mismatch. |
| C4 | **Never permit unlicensed pharmacy operations.** Selling, dispensing, storing or delivering medicines requires a validated licence for the fulfilment location and jurisdiction. Marketplace listings are scoped to licensed entities and licensed sites. | Licence-validity check at onboarding, before order acceptance, and before dispatch; expiry suspension; no cross-jurisdiction fulfilment without explicit authorisation. |
| C5 | **Never allow AI to independently diagnose or prescribe.** AI may classify administrative intent, summarise non-clinical text, draft operational messages, surface documented reference information, and flag anomalies for human review. It may not output a diagnosis, prescribe a medicine, alter a clinical record, or release a result. | AI output classification + allowlist; clinical endpoints reject AI principals; every high-risk action requires a named human approver; audit record mandatory. |
| C6 | **Protect all patient information.** Minimum necessary access, encryption everywhere, granular consent, immutable audit, no PHI in analytics or model training by default, step-up authentication for sensitive operations. | Consent service, ABAC policy engine, DLP checks in CI, PHI scan on logs/telemetry, periodic access recertification. |
| C7 | **Require human approval for sensitive clinical and financial operations.** Includes: releasing results, changing a clinical record, issuing/refilling a prescription, approving refunds/payouts above threshold, deactivating a provider, cross-border data transfer, and deleting records. | Four-eyes workflow with named approver, reason code, timestamp, and immutable evidence; no service account may self-approve. |
| C8 | **Keep all development decisions documented.** Every architectural, product, pricing, clinical-safety and localisation decision gets a decision ID, rationale, alternatives, owner, status and date. | `DECISION_LOG.md` plus ADR records; PR template requires decision reference; CI check fails on undocumented high-risk change. |
| C9 | **Do not start coding until reviewed and approved by the project owner.** No repository source, infrastructure, schema, or prototype code until approval gate is recorded. | This document's status; approval gate in `DECISION_LOG.md`; build boards remain empty until approved. |
| C10 | **No copy of reference-company IP.** Eka Care, Practo and Tata 1mg are business-model references only. No branding, design, copy, code, data, workflow diagrams, or protected expression may be reproduced. | Clean-room design review; provenance check on all creative assets; legal review before publication. |

### 2.1 Safety classification of actions

Every action in the system is assigned one of three classes. The class determines automation permission.

| Class | Definition | Automation allowed | Examples |
|---|---|---|---|
| **A — Administrative** | No effect on clinical care or money movement | Yes, with audit | Appointment reminder, FAQ answer from approved content, internal routing of a support ticket |
| **B — Sensitive administrative** | Affects access, money, or visibility but not clinical content | Human approval required | Publishing a provider profile, changing a price, refund above threshold, exporting a report |
| **C — Clinical / regulated** | Affects diagnosis, treatment, medicines, results, or legal record | Named licensed human required; AI may only prepare | Releasing lab result, signing a note, issuing/refilling prescription, updating diagnosis, suspending a provider |

**Rule:** an AI principal can never be the approver of a Class B or C action. An AI-generated artefact is always `draft` until a human signs it.

---

## 3. Reference boundary and market archetypes

### 3.1 Permitted reference use

The following are public business-model archetypes only. EMDO has no affiliation, licence, data access, or endorsement from any of them.

| Reference | Business-model pattern studied | Explicitly excluded |
|---|---|---|
| Eka Care | Health-record-first consumer engagement; digital records as anchor; provider tools around the record | Brand, UI, icons, copy, onboarding flow, proprietary workflows, any code or data |
| Practo | Two-sided doctor discovery and appointment marketplace; provider profile and scheduling economics | Brand, listing design, review mechanics as implemented, proprietary ranking, any code or data |
| Tata 1mg | Pharmacy and diagnostics marketplace; catalogue, fulfilment and subscription mechanics | Brand, catalogue data, packaging imagery, pricing engine, any code or data |

### 3.2 Clean-room rules

1. Requirements are derived from first principles and African-market constraints, then compared against publicly observable archetypes for completeness only.
2. No employee or contractor with access to a reference company's confidential material may contribute to the competing design without a documented clean-room separation.
3. All visual design assets must carry a provenance record: created for EMDO, licensed with rights, or public domain. Unattributed assets are rejected.
4. Marketing copy must not imply comparison, endorsement, partnership, or "better than" a named competitor.
5. Reviewer and rating mechanics must be independently designed: verified, completed, non-clinical encounters only; no rating of clinical competence by AI; no incentivised reviews.

---

## 4. Target users and permissions

### 4.1 Personas

| Persona | Primary need | Access constraints |
|---|---|---|
| Patient (adult, self) | Record, find care, book, order medicines/tests, manage subscription | Own record only; step-up auth for sharing and financial actions |
| Family caregiver / dependant manager | Manage care for children, parents, or wards | Access only via recorded legal/guardian authority or explicit patient delegation; time-bounded |
| Patient with low literacy / low connectivity | Understand care, receive reminders, keep records offline | Voice/IVR and USSD design targets; no clinical content from unreviewed machine translation |
| Verified clinician | Manage availability, consult, document, sign records | Country-scoped licence must be `verified`; own patients only; no AI signing |
| Clinic/hospital administrator | Staff, schedule, rooms, billing, reporting | Organisation-scoped RBAC; financial actions dual approval |
| Pharmacist-in-charge | Verify and dispense orders, manage stock | Pharmacy licence and site must be valid; no dispensing without valid prescription where required |
| Laboratory director / scientist | Receive samples, run workflow, release results | Lab licence valid; result release requires named authorised person |
| Employer benefits administrator | Enrol members, view aggregated utilisation, manage contract | No individual clinical data; aggregate threshold applies |
| Platform compliance officer | Oversee verification, consent, incidents, audits | Broad read; mutations require recorded reason and second approver |
| Support agent | Resolve non-clinical issues | No clinical records by default; break-glass access with post-event review |
| Auditor / regulator | Evidence inspection | Read-only, time-bounded, fully logged |

### 4.2 Permission model

Permissions are the intersection of: **role × organisation × country scope × consent grant × purpose × assurance level**. Deny by default. A missing or stale country profile denies access (fail-closed). Provider permissions also require a valid credential record; pharmacy/lab permissions require a valid site licence.

---

## 5. Product requirements: module definitions

Each module lists functional requirements (FR), non-functional requirements (NFR) and hard stops. IDs are stable and referenced by roadmaps and tests.

### 5.1 M1 — EMDO Record

**Purpose:** a patient-controlled, longitudinal health record that can be shared deliberately with verified providers.

| ID | Requirement | Priority |
|---|---|---|
| FR-M1-01 | Create patient profile with multiple identity documents; no single-ID requirement for non-clinical access | Must |
| FR-M1-02 | Store structured data: demographics, allergies, medications, conditions, immunisations, encounters, observations, documents | Must |
| FR-M1-03 | Capture documents via photo/PDF with client-side compression; offline queue with conflict resolution | Must |
| FR-M1-04 | Share record via purpose-specific, time-bound, revocable grant; show exactly what was shared to whom and when | Must |
| FR-M1-05 | Support emergency "break-glass" access with mandatory reason, auto-expiry, and post-event compliance review | Must |
| FR-M1-06 | Maintain an auditable history of every record change; corrections append, never silently overwrite | Must |
| FR-M1-07 | Allow patient to correct or dispute an entry; dispute is visible to the provider and recorded | Must |
| FR-M1-08 | Export record in a standard interchange format (FHIR R4 design target) and human-readable summary | Should |
| FR-M1-09 | Link dependants only after verified authority or patient delegation is recorded | Must |
| NFR-M1-01 | Only the data controller's configured residency zone may store identifiable record content | Must |
| NFR-M1-02 | Record content never indexed in a general search index without field-level controls | Must |
| NFR-M1-03 | Read of a clinical record requires step-up authentication when risk score is elevated | Should |

**Hard stops:** no record may be created from an unverified source and presented as clinically authoritative; no AI may amend a clinical entry; no caregiver access without recorded authority.

### 5.2 M2 — EMDO Care

**Purpose:** discovery and booking of verified clinicians.

| ID | Requirement | Priority |
|---|---|---|
| FR-M2-01 | Provider directory with specialty, languages, location, telehealth availability, fees, and verification badge with verification date | Must |
| FR-M2-02 | Search and filter by need, location, language, availability, accessibility, and price band | Must |
| FR-M2-03 | Profile shows only verified qualifications with source type and jurisdiction; no self-declared credential displayed as verified | Must |
| FR-M2-04 | Appointment booking with slot hold, confirmation, reschedule, cancel, and no-show policy | Must |
| FR-M2-05 | Patient-reported experience captured only for completed encounters; clearly separated from clinical quality | Should |
| FR-M2-06 | No promoted placement may be presented as a clinical recommendation; sponsored content labelled and excluded from clinical ranking | Must |
| FR-M2-07 | Waitlist and cancellation alerts where locally appropriate | Could |
| NFR-M2-01 | Directory entry deactivates automatically if verification lapses | Must |

**Hard stops:** unverified providers are invisible to patients; no fee may purchase clinical ranking; no "top doctor" claim without a documented, disclosed methodology (and never AI-generated).

### 5.3 M3 — EMDO Telehealth

**Purpose:** governed consultation between a verified clinician and a patient.

| ID | Requirement | Priority |
|---|---|---|
| FR-M3-01 | Pre-consult intake: reason for visit, consent, recording preference, identity confirmation — explicitly non-diagnostic | Must |
| FR-M3-02 | Consult channels: video, audio, asynchronous message, with bandwidth-aware fallback | Must |
| FR-M3-03 | Clinician can view only records covered by an active consent grant | Must |
| FR-M3-04 | Clinician documents note and signs it; AI draft may be edited but cannot be auto-signed | Must |
| FR-M3-05 | Prescription issuance only by a verified, licensed clinician, only where lawful, with jurisdiction validity check | Must |
| FR-M3-06 | Safety routing: red-flag keywords trigger a "seek emergency care" message and are logged; platform never claims to provide emergency services | Must |
| FR-M3-07 | Post-consult summary, medicine/test instructions, and follow-up booking | Must |
| FR-M3-08 | Recording requires explicit consent from all parties and is disabled by default | Must |
| NFR-M3-01 | Session media encrypted, not retained by default; retention only with documented consent and legal basis | Must |
| NFR-M3-02 | Cross-border consultation blocked unless both jurisdictions permit it and clinician is authorised | Must |

**Hard stops:** no AI-generated diagnosis or prescription; no consultation without a verified clinician; no cross-border consult with an unauthorised clinician; no promise of emergency response.

### 5.4 M4 — EMDO Practice

**Purpose:** clinic and hospital administration and clinical documentation.

| ID | Requirement | Priority |
|---|---|---|
| FR-M4-01 | Organisation, branch, department, room and staff management with country-scoped licensing checks | Must |
| FR-M4-02 | Appointment calendar, queue, check-in, triage staging (non-diagnostic), and visit status workflow | Must |
| FR-M4-03 | Encounter documentation templates, clinician signature, addendum and correction workflow | Must |
| FR-M4-04 | Charges, invoices, receipts, insurance/claims submission where authorised | Must |
| FR-M4-05 | Stock and consumables for clinics that dispense, subject to the same licence rules as M5 | Must |
| FR-M4-06 | Referral to pharmacy/lab creates an order only on clinician instruction; no automatic product upsell | Must |
| FR-M4-07 | Shift handover and task assignment with named owner | Should |
| FR-M4-08 | Bed/occupancy and procedure scheduling for hospital tier | Could |
| NFR-M4-01 | All clinical document writes attributed to a named human; service accounts cannot sign | Must |

**Hard stops:** no unlicensed facility activated; no clinical note without a named author; no auto-posting of AI drafts.

### 5.5 M5 — EMDO Pharmacy

**Purpose:** marketplace for licensed pharmacies to list, verify, dispense and deliver medicines.

| ID | Requirement | Priority |
|---|---|---|
| FR-M5-01 | Pharmacy onboarding: business registration, pharmacy licence, site licence, pharmacist-in-charge verification, controlled-substance permissions where relevant | Must |
| FR-M5-02 | Catalogue scoped by jurisdiction; medicine registration status, manufacturer, batch, expiry, and storage requirements captured | Must |
| FR-M5-03 | Prescription requirement flag per item; prescription-bearing orders cannot proceed without a valid prescription from a verified prescriber where required | Must |
| FR-M5-04 | Pharmacist verification of every prescription-bearing order before dispatch; recorded sign-off | Must |
| FR-M5-05 | Substitution, generic replacement and partial fulfilment require explicit patient consent and pharmacist decision | Must |
| FR-M5-06 | Cold-chain and temperature-sensitive handling instructions; cold-chain proof where applicable | Should |
| FR-M5-07 | Delivery confirmations, returns and destruction workflow for medicines (no restock of returned medicines unless locally lawful and policy-approved) | Must |
| FR-M5-08 | Adverse reaction and product-quality report capture routed to a named human | Must |
| FR-M5-09 | No advertisement of prescription-only medicines to the public where prohibited | Must |
| NFR-M5-01 | Licence expiry suspends new orders automatically | Must |
| NFR-M5-02 | Controlled substances are excluded until a dedicated, country-specific legal opinion and control system exist | Must |

**Hard stops:** no sale from an unlicensed site; no prescription medicine dispensed without valid prescription and pharmacist verification; no cross-border medicine shipment without explicit legal authorisation; no AI authorship of prescription decisions.

### 5.6 M6 — EMDO Labs

**Purpose:** marketplace for licensed diagnostic laboratories and accredited sample collection.

| ID | Requirement | Priority |
|---|---|---|
| FR-M6-01 | Lab onboarding: facility licence, accreditation where required, scope of tests, named responsible professional | Must |
| FR-M6-02 | Test catalogue with preparation instructions, turnaround target (as stated by the lab, not by EMDO), and price | Must |
| FR-M6-03 | Test request accepted only from a verified clinician or as directly permitted by local law | Must |
| FR-M6-04 | Sample collection booking, home collection where lawful, chain-of-custody identifiers, transport and temperature logging | Must |
| FR-M6-05 | Results released only by a named authorised lab professional; patient sees result only after release | Must |
| FR-M6-06 | Critical/urgent result flag triggers a defined human escalation workflow; no automated clinical interpretation | Must |
| FR-M6-07 | Result correction and amendment workflow with version history and notification | Must |
| NFR-M6-01 | Result content is PHI and must never be used as AI training input by default | Must |

**Hard stops:** no unlicensed lab; no AI interpretation released as clinical advice; no result visible before authorised release; no sample transport that breaks custody or temperature requirements.

### 5.7 M7 — EMDO Family

**Purpose:** consumer subscriptions covering an individual, a household, or a dependant group.

| ID | Requirement | Priority |
|---|---|---|
| FR-M7-01 | Plans with clear inclusions/exclusions, currency-local pricing, and no implied insurance coverage | Must |
| FR-M7-02 | Add/remove dependants with authority check; changes effective at next billing cycle unless legally required sooner | Must |
| FR-M7-03 | Benefit usage ledger visible to the subscriber; clinical details of other members hidden unless delegated | Must |
| FR-M7-04 | Payment via local methods, mobile money and card where available; no card data stored by EMDO | Must |
| FR-M7-05 | Renewal reminders, grace periods, cancellation, refund rules and dispute workflow | Must |
| FR-M7-06 | Fair-use and abuse controls applied consistently and disclosed | Should |
| NFR-M7-01 | All plan benefit changes require human approval and versioned disclosure | Must |

**Hard stops:** never describe a subscription as insurance unless the entity is licensed as an insurer and approved by legal; never auto-enrol a dependant without recorded authority.

### 5.8 M8 — EMDO Corporate

**Purpose:** employer-sponsored access to the platform with aggregated reporting.

| ID | Requirement | Priority |
|---|---|---|
| FR-M8-01 | Employer account, contract, eligible member list, and enrolment status | Must |
| FR-M8-02 | Employer pays via invoice or approved digital method; corporate pricing approved by human | Must |
| FR-M8-03 | Employer sees only aggregate, thresholded utilisation; never individual clinical data | Must |
| FR-M8-04 | Employee retains control of their own health record; employer cannot view individual records by default | Must |
| FR-M8-05 | Optional well-being programmes with consent and non-coercive participation | Should |
| FR-M8-06 | Contract renewal, dispute and termination workflow | Must |
| NFR-M8-01 | Aggregate reports suppress groups below a configured minimum count | Must |

**Hard stops:** no employer access to individual clinical data without explicit, revocable employee consent and legal basis; no representation that the plan is an insurance policy unless licensed.

### 5.9 M9 — EMDO Assist

**Purpose:** AI-assisted administration. It is the only module where AI is first-class, and it exists to reduce administrative burden — not to provide care.

**Permitted AI functions (allowlist):**

| Function | Class | Output | Approval |
|---|---|---|---|
| Summarise a non-clinical support conversation | A | Draft summary | None, audited |
| Draft appointment reminder or routing message | A | Draft message | Human for send if it references clinical content |
| Extract administrative fields from a document (e.g. invoice number) | A | Structured draft | Human confirms before write |
| Flag duplicate provider profile for review | A | Review queue item | Compliance officer decides |
| Flag unusual claim/order pattern for review | B | Alert | Human investigator |
| Suggest staff shift template | B | Draft schedule | Practice manager approves |
| Summarise a clinical note for patient-friendly language | C-assistive | Draft text | Clinician reviews and signs; AI never signs |
| Retrieve documented reference content | C-assistive | Verified excerpt with source | Clinician applies judgement |

**Prohibited AI functions (denylist):** diagnosis, differential diagnosis, triage decisions that determine care access, prescription or dosage selection, result interpretation released to patient, autonomous record edit, autonomous result release, autonomous refund/payout, autonomous provider suspension, autonomous cross-border transfer, AI-generated testimonial or outcome claim.

| ID | Requirement | Priority |
|---|---|---|
| FR-M9-01 | Model gateway with allowlist/denyllist enforcement; requests outside allowlist rejected | Must |
| FR-M9-02 | Every AI output labelled with model version, provenance, confidence display policy and "draft" state | Must |
| FR-M9-03 | Mandatory human approver for Class B/C outputs; approver identity recorded | Must |
| FR-M9-04 | Retrieval restricted to an approved content registry with source, version, review date and jurisdiction | Must |
| FR-M9-05 | Prompt-injection and PHI-leak tests in CI; redact PHI before any external model call | Must |
| FR-M9-06 | No patient data used to train or fine-tune models by default; any exception requires separate explicit consent, de-identification and a new decision record | Must |
| FR-M9-07 | Evaluation set covering safety, hallucination, bias, language quality and refusal behaviour; results recorded, never published as marketing without evidence review | Must |
| FR-M9-08 | Human override and kill switch; AI can be disabled per country, per module, per function | Must |
| NFR-M9-01 | All AI interactions logged with input hash, output hash, model version, approver and decision | Must |
| NFR-M9-02 | Latency and cost budgets tracked per function; unapproved models blocked at registry level | Should |

**Hard stops:** no AI principal may appear as approver, prescriber, signer, or licence holder; no external model receives identifiable patient data by default; no unapproved model in production.

### 5.10 M10 — EMDO Insight

**Purpose:** business intelligence for operators, providers and employers using de-identified, access-controlled data.

| ID | Requirement | Priority |
|---|---|---|
| FR-M10-01 | Dashboards for operations, utilisation, provider performance (non-clinical), pharmacy/lab fulfilment, and finance | Must |
| FR-M10-02 | All reports derived from de-identified or aggregated datasets; row-level PHI not exposed | Must |
| FR-M10-03 | Minimum group size threshold and suppression for small cells | Must |
| FR-M10-04 | Role-based report catalogue; export requires approval and watermark | Must |
| FR-M10-05 | Metric definitions versioned with owner, formula and evidence status | Must |
| FR-M10-06 | No "clinical outcome" or "quality" ranking produced without a documented, clinically reviewed methodology | Must |
| NFR-M10-01 | Query engine cannot join to identifiable tables from BI roles | Must |

**Hard stops:** no individual patient identifiable in a dashboard; no vendor-supplied metric presented as measured EMDO performance; no employer view of individual members.

---

## 6. End-to-end user journeys

Journeys describe intended future behaviour. None are live. Each journey lists steps, control gates and failure states.

### 6.1 Patient and family journeys

**J1 — Create account and establish consent**
1. Choose country → language → channel.
2. Register with phone/email; verify via OTP or approved identity method.
3. Set assurance level; add recovery factor.
4. Read and accept privacy notice and consent purposes (separate consents: care, fulfilment, analytics opt-in, research opt-in).
5. Result: patient workspace created; no clinical data required.
- **Controls:** no single national-ID requirement for basic access; consent version recorded; analytics/research default off.

**J2 — Build health record**
1. Add demographics, allergies, medications, conditions manually or from document.
2. Upload document; client compresses; offline queue if needed.
3. System extracts administrative fields with AI as draft; patient confirms each field.
4. Record version created with source and timestamp.
- **Controls:** AI never writes a clinical field without patient confirmation; duplicates flagged not merged automatically.

**J3 — Share record with a provider**
1. Patient selects provider and purpose (consultation, referral, second opinion).
2. Chooses scope and expiry; sees preview of what will be shared.
3. Step-up authentication; grant issued.
4. Provider sees only granted scope until expiry.
5. Revocation immediately terminates access; access log retained.
- **Failure:** expired or revoked grant → provider sees "no active grant"; no fallback to full record.

**J4 — Find a doctor**
1. Enter need, location, language, telehealth/in-person preference.
2. Review verified profiles and verification date.
3. Check availability and fees.
4. Select and proceed to booking.
- **Controls:** unverified profiles never shown; sponsored placements labelled and excluded from clinical ranking.

**J5 — Book, reschedule, cancel**
1. Select slot; slot held briefly.
2. Confirm reason (non-clinical) and channel.
3. Pay or record commitment per local model; confirmation sent.
4. Reschedule/cancel within policy; waitlist offered.
- **Failure:** provider verification lapses → appointment cancelled with notice and no penalty to patient.

**J6 — Pre-consult intake**
1. Patient submits reason, duration, relevant record grant.
2. Safety screen flags emergency indicators and displays "seek emergency care" guidance.
3. Clinician receives administrative packet.
- **Controls:** no triage decision by AI; flags are prompts to a human, not care denials.

**J7 — Telemedicine consultation**
1. Identity recheck; consent to consult and recording preference.
2. Video/audio/async session with bandwidth fallback.
3. Clinician reviews granted record, documents note, signs.
4. Optional prescription where lawful, signed by clinician.
5. Patient receives summary; follow-up booking offered.
- **Controls:** cross-border block if unauthorised; recording off by default; AI may draft note but clinician signs.

**J8 — In-person visit at clinic**
1. Check-in via QR/code or manual ID.
2. Queue and triage staging by authorised staff (non-diagnostic).
3. Consultation; clinician updates record with consent.
4. Charges and invoice; payment or claim submission where authorised.
5. Referral to pharmacy/lab only on clinician instruction.

**J9 — Prescription to pharmacy fulfilment**
1. Patient receives signed prescription in record.
2. Patient chooses a licensed pharmacy or is referred by clinician without financial incentive.
3. Pharmacy verifies prescription with pharmacist sign-off.
4. Patient confirms substitutions/partial fulfilment.
5. Dispatch and delivery confirmation; adverse-event reporting link.
- **Controls:** no prescription generated by AI; no dispatch without pharmacy verification; controlled substances excluded by default.

**J10 — Lab test ordering**
1. Verified clinician requests test (or direct-to-consumer where lawful).
2. Patient sees preparation instructions and price from lab.
3. Book sample collection or visit lab; chain-of-custody ID issued.
4. Sample transported with temperature/timestamp logging.
5. Authorised lab professional releases result.
6. Patient views result; can request human explanation.
- **Controls:** no AI interpretation released; critical flag escalates to human; corrections versioned.

**J11 — Manage family**
1. Subscriber adds dependant with authority evidence or patient delegation.
2. Dependant record linked with scoped access.
3. Subscriber views benefit usage, not another adult's clinical details by default.
4. Removal/authority expiry revokes access.
- **Controls:** guardian authority verified; adolescent privacy settings considered per jurisdiction.

**J12 — Subscription and payments**
1. Select plan and currency; see inclusive items and exclusions.
2. Pay via local method/mobile money/card; PSP handles card data.
3. Receipt and renewal notice; reminder before renewal.
4. Cancel, pause or change plan; refund per published policy with human approval.
- **Controls:** no claim of insurance; all price changes disclosed and human-approved.

**J13 — Support, complaint, adverse event**
1. Patient opens non-clinical support ticket or clinical-safety report.
2. Classify: administrative vs. adverse event vs. complaint.
3. Administrative handled by agent; adverse event routed to named clinical governance owner with statutory timeline tracking per jurisdiction.
4. Outcome recorded; no deletion of safety reports.

**J14 — Exercise data rights**
1. Request access, correction, deletion, or consent withdrawal.
2. Identity re-verification; request logged.
3. Human reviews legal basis and clinical retention requirements.
4. Fulfil within applicable timeframe; record evidence.
- **Controls:** clinical records may be retained where law requires; patient informed of exception.

### 6.2 Provider and facility journeys

**J15 — Doctor registration and verification**
1. Create professional account; submit identity, licence, specialty, practice locations.
2. System queues verification against authoritative source for each jurisdiction.
3. Status `under_review`; profile invisible to patients.
4. On successful verification → `verified`; profile publishable after human compliance approval.
5. Periodic re-verification; mismatch or expiry → suspension and patient notice.

**J16 — Manage schedule**
1. Set availability, telehealth capacity, leave.
2. System checks licence validity for each jurisdiction before slots go live.
3. Changes published after confirmation; conflicts flagged.

**J17 — Consult and document**
1. Open appointment; identity and consent status checked.
2. Record note; AI may draft from structured inputs; clinician edits.
3. Clinician signs; record versioned; patient notified per settings.

**J18 — Clinic onboarding**
1. Facility registration, licences, departments, staff roles.
2. Staff accounts created with role-specific permissions and MFA.
3. Appointment templates, pricing, and payment methods configured.
4. Readiness checklist completed before first patient.

**J19 — Pharmacy onboarding and order processing**
1. Business and pharmacy licence, site licence, pharmacist-in-charge submitted.
2. Verification and human approval; catalogue enabled only after approval.
3. Order received → prescription check → pharmacist verification → pack → dispatch.
4. Licence expiry or failed check blocks new orders automatically.

**J20 — Lab onboarding and result release**
1. Facility licence, accreditation/scope, named responsible professional submitted.
2. Verification; test catalogue enabled.
3. Sample received → custody check → workflow → authorised release.
4. Corrections versioned; patient notified.

### 6.3 Corporate journeys

**J21 — Employer onboarding**
1. Employer registers; contract and eligible group defined.
2. Legal review of plan wording (not insurance unless licensed).
3. Members enrolled after individual consent.
4. Employer receives aggregate dashboard only.

**J22 — Member enrolment and use**
1. Employee receives invitation; accepts or declines without penalty.
2. Uses platform as an individual patient; employer cannot see individual care.
3. Aggregate utilisation contributes to reports above threshold.

### 6.4 Internal journeys

**J23 — AI suggestion to human approval**
1. AI produces draft with provenance and risk class.
2. Class A: audited and applied. Class B/C: routed to named approver.
3. Approver accepts, edits, or rejects with reason.
4. Evidence stored; reversal path available.

**J24 — Incident/breach response**
1. Alert from monitoring or report; incident commander named.
2. Contain, assess scope, notify regulator/data subjects where required.
3. Remediate, post-mortem, decision record, and readiness-gate reassessment.

**J25 — Provider suspension**
1. Trigger: registry mismatch, complaint, licence expiry, safety concern.
2. Compliance officer reviews; second approver for suspension.
3. Provider hidden immediately; patients notified where appropriate; appointments handled.

---

## 7. Subscription and revenue model

> **All prices, rates and mix percentages below are planning assumptions (unvalidated, uncited). They are design inputs for discussion, not offers, not validated market prices, and not reported performance. Each must be re-costed per country before approval.**

### 7.1 Revenue streams

| Stream | Payer | Mechanism | Design guardrail |
|---|---|---|---|
| Patient/family subscriptions | Patient or family | Recurring plan fee in local currency | No insurance implied; benefits disclosed |
| Corporate plans | Employer | Per-member-per-month or contract fee | Aggregate reporting only; legal review of wording |
| Provider SaaS | Clinic/hospital | Tiered subscription by size/module | No charge for regulatory compliance features that should be universal |
| Pharmacy marketplace | Pharmacy | Commission on completed, verified orders or listing fee | No pay-for-prescription-priority; no referral kickback |
| Lab marketplace | Laboratory | Commission on completed orders or listing fee | No payment for faster result release |
| Telehealth consultation fee | Patient/plan | Per-consult fee or included benefit | Clinician fee set transparently; no AI-generated billing codes |
| Implementation/integration services | Facility | One-off onboarding fee | Optional; cannot be required for regulatory compliance |
| De-identified analytics/API | Enterprise/research | Licence for aggregated data with approval | No individual data; ethics/legal review per dataset |
| Advertising/sponsorship | Vendor | Clearly labelled, non-clinical placement | Excluded from clinical ranking; no prescription medicine ads to public where prohibited |

### 7.2 Consumer plan structure (planning assumption)

| Plan | Intended audience | Illustrative included benefits | Illustrative price band (USD-equivalent, unvalidated) |
|---|---|---|---|
| EMDO Basic | Individual | Record, directory access, appointment booking, self-pay consults | Free or low-cost local tier |
| EMDO Family | Household | Basic + dependant management, priority booking, family record view by authority | $8–$20 / month equivalent |
| EMDO Care Plus | Individual/family needing more | Family + included telehealth consults, care coordination, discounted lab/test bundles | $20–$45 / month equivalent |
| EMDO Corporate | Employer-sponsored | Care Plus-like benefits paid by employer, aggregate reporting | $12–$30 per member / month equivalent |

Local prices must be set in local currency with periodic review; mobile-money and cash-adjacent payment pathways are design targets. No plan may be called insurance unless licensed.

### 7.3 Provider and facility SaaS (planning assumption)

| Tier | Target | Illustrative price band |
|---|---|---|
| Clinic Starter | Small practice, scheduling + records + basic billing | $30–$90 / month equivalent |
| Clinic Pro | Multi-provider practice, referrals, analytics, telehealth | $90–$300 / month equivalent |
| Hospital/Group | Multi-branch, departments, integrations, advanced reporting | Custom, approved by human |
| Pharmacy | Catalogue, order management, stock, verification workflow | $40–$150 / month equivalent |
| Laboratory | Test catalogue, sample workflow, results workflow | $40–$150 / month equivalent |

Universal safety, verification, consent and audit capabilities are included at every tier at no extra charge.

### 7.4 Marketplace commission bands (planning assumption)

| Category | Illustrative band | Notes |
|---|---|---|
| Pharmacy orders | 5–12% of completed order value | Varies by country and medicine category; no referral payment |
| Lab orders | 8–15% of completed order value | No payment for result-release speed |
| Consultation bookings | 8–15% of consultation fee | Transparent to patient and clinician |

### 7.5 Pricing governance

1. Every public price and benefit claim has a version, effective date, approver and country scope.
2. No price may be changed by an automated system; AI may draft scenarios only.
3. No "discount" or "free" claim without documented cost ownership.
4. No testimonial, savings claim, outcome claim, or "trusted by X" claim without a verified evidence record and owner approval.
5. Referral relationships must be disclosed; no payment for clinical referral.

---

## 8. African market localisation requirements

### 8.1 Language and content

| Requirement | Detail |
|---|---|
| Interface languages | Design targets: English, French, Arabic, Portuguese, Swahili, Hausa, Amharic, Yoruba, Igbo, Zulu, and others per country activation. Final list is an owner decision. |
| Right-to-left | Arabic UI support required where activated. |
| Clinical content translation | Any patient-facing clinical content must be reviewed by a qualified human with language and clinical competence. Machine translation may draft only. |
| Low literacy | Voice guidance, icon-supported flows, plain-language summary, and IVR design targets. |
| Consent comprehension | Consent text must be understandable in the local language; comprehension testing required before activation. |

### 8.2 Currency and payments

| Requirement | Detail |
|---|---|
| Local currency display | Prices shown in local currency; USD reference internal only. |
| Payment methods | Design targets: mobile money, bank transfer, card via PSP, cash-on-delivery where lawful, and USSD flows. Availability is per-country and contract-dependent; no method is claimed as active. |
| FX | Rate lock window and disclosed conversion fee; patient sees final amount before confirmation. |
| Receipts | Local tax-compliant receipts and records. |
| No card storage | EMDO never stores full card numbers; PSP scope reduction. |

### 8.3 Connectivity and devices

- Android-first mobile client, low-storage and low-bandwidth modes.
- Offline record capture with encrypted local queue and conflict resolution.
- Store-and-forward for non-urgent workflows; never for emergency care.
- USSD/SMS/voice channels as design targets for appointment confirmation, reminders and basic record access with strong authentication.
- Compressed document capture and resumable uploads.
- No critical clinical function may depend on continuous high-bandwidth connectivity.

### 8.4 Identity and inclusion

- Multiple acceptable identity documents; no patient excluded solely for lacking a national ID.
- Alternative verification pathways for non-clinical access, with documented assurance level.
- Provider identity and licence verification remains strict and non-negotiable.
- Refugee, internally displaced and cross-border family cases considered in consent and record-portability design.
- Shared-device privacy: quick-exit, session timeout, and discreet notifications.

### 8.5 Clinical and regulatory localisation

| Area | Requirement |
|---|---|
| Medicine catalogue | Based on locally registered medicines and national essential medicines lists; country-specific formulary rules. |
| Prescription validity | Validate prescriber licence and jurisdiction; cross-border prescriptions accepted only where lawful. |
| Pharmacy licensing | Licence, site, storage, controlled-substance permissions verified per country. |
| Lab licensing | Facility licence, accreditation, test scope and quality requirements verified per country. |
| Data protection | Country data-protection law mapped before activation (e.g. Nigeria NDPA, Kenya Data Protection Act, South Africa POPIA, Ghana Data Protection Act, and others as applicable). This is a design input, not legal advice; counsel must confirm current requirements. |
| Medical councils | Provider verification sources must be identified and contracted per country; no source is assumed. |
| Advertising | Compliance with local rules on medicine advertising, health claims and promotional content. |
| Traditional medicine | Never presented as verified clinical treatment unless regulated and evidenced; handle respectfully and clearly labelled. |
| Public health | Support for statutory reporting workflows where authorised; no autonomous reporting by AI. |

### 8.6 Cultural and operational fit

- Family-centred care model with explicit consent boundaries for adult patients.
- Gender and privacy considerations in channel choice and notification content.
- Community health worker role as a design target with limited, audited permissions.
- Working hours, languages and payment cycles aligned to local practice.
- Service support in local languages and time zones.

---

## 9. Multi-country architecture

### 9.1 Tenancy model

Country is a first-class dimension, not a UI filter.

```
Global Control Plane
 ├── Identity, consent policy templates, AI registry, audit metadata, catalogue of country profiles
 └── Country Data Plane (per jurisdiction)
      ├── Identifiable patient data (in-country residency)
      ├── Provider credential records and licence status
      ├── Pharmacy/lab licence and site records
      ├── Orders, payments ledger, appointment data
      └── Country-specific configuration and feature gates
```

**Key rule:** global services hold metadata and de-identified aggregates only. Identifiable health data stays in the configured residency zone for that country unless a documented, approved cross-border mechanism exists.

### 9.2 Country profile object

Every country activation requires a versioned profile containing:

| Field | Purpose |
|---|---|
| `country_code`, `jurisdiction_id` | Scope identification |
| `regulatory_profile` | Applicable laws, regulators, licensing authorities |
| `data_residency_zone` | Where identifiable data must live |
| `permitted_channels` | Telehealth, home sample collection, home delivery rules |
| `verification_sources` | Authoritative registries for doctors, pharmacies, labs (TBC per country) |
| `payment_methods` | Approved PSPs and local methods (TBC) |
| `languages`, `currency`, `timezone` | Localisation |
| `clinical_content_set` | Approved reference content version |
| `feature_gates` | Which modules/functions are permitted |
| `activation_status` | `planned → ready_for_review → approved → suspended → retired` |

A missing or incomplete profile causes fail-closed denial of clinical and financial actions.

### 9.3 Cross-country rules

| Scenario | Rule |
|---|---|
| Patient travels | Own record remains in home residency zone; temporary access in another country only via approved mechanism and consent |
| Provider licensed in two countries | Separate credential records per jurisdiction; no automatic reciprocity assumption |
| Pharmacy fulfilment across border | Blocked by default; requires legal opinion, customs/tax handling and explicit authorisation |
| Teleconsult across border | Blocked unless both jurisdictions permit and clinician authorised |
| Aggregated analytics | Global warehouse receives de-identified data meeting k-anonymity/suppression thresholds |
| Data subject request | Routed to controller country; global coordination with legal oversight |

### 9.4 Country activation gate

A country cannot move to `approved` until all of the following have documented evidence: legal opinion; identity/data-protection mapping; provider verification source; pharmacy/lab licensing framework; payment method agreements; clinical governance owner; AI content set reviewed; residency infrastructure tested; incident response and support coverage; owner sign-off. No country is approved in this specification.

---

## 10. Technical blueprint

> Target architecture only. No implementation, no stack commitment and no infrastructure provisioning is authorised until owner approval. Technology names below are candidate patterns to be decided in ADRs.

### 10.1 Logical architecture

```
Clients
  Web (responsive) | Android-first mobile | USSD/SMS/Voice design targets
        |
  Edge / CDN / WAF / DDoS protection
        |
  API Gateway -> BFF (per client family)
        |
  Service mesh (mTLS)
        |
  +------------------- Core services -------------------+
  | Identity & Consent | Record | Scheduling | Consult  |
  | Verification       | Order  | Pharmacy   | Lab      |
  | Billing/Ledger     | Notify | AI Gateway | Audit    |
  | Analytics Pipeline | Config | Feature Gates         |
  +-----------------------------------------------------+
        |
  Data layer: OLTP DB (row-level tenancy), encrypted object store,
  event bus, search index (PHI-controlled), de-identified warehouse,
  vector store (approved content only), KMS/HSM
```

### 10.2 Service responsibilities

| Service | Owns | Never does |
|---|---|---|
| Identity & Consent | Accounts, assurance levels, grants, delegation | Read clinical content |
| Record | Clinical documents, versions, source attribution | Autonomously change clinical content |
| Verification | Credential and licence status, re-verification jobs | Approve a provider without evidence |
| Scheduling | Slots, bookings, calendars, waitlists | Override licence gating |
| Consult | Session orchestration, note workflow | Generate diagnosis or sign notes |
| Order | Cart, order state machine, fulfilment status | Decide clinical necessity |
| Pharmacy | Catalogue, verification, dispatching | Sell from unlicensed site |
| Lab | Test catalogue, sample custody, result release | Interpret results autonomously |
| Billing/Ledger | Charges, receipts, payouts, reconciliation | Approve refunds above threshold autonomously |
| AI Gateway | Model routing, allowlist, redaction, logging | Approve class B/C actions |
| Audit | Append-only evidence, tamper-evidence | Allow deletion by application role |
| Analytics | De-identified transformation, metrics | Join to identifiable PHI |

### 10.3 Data principles

1. **PHI classification:** every field tagged `PHI`, `sensitive`, `personal`, or `public`.
2. **Encryption:** TLS 1.3 in transit; AES-256 at rest; envelope encryption with per-country/per-tenant keys; rotation schedule.
3. **Row-level tenancy:** every query scoped by country, organisation and consent.
4. **Append-only clinical history:** corrections are new versions; no silent overwrite.
5. **De-identification pipeline:** deterministic pseudonymisation plus suppression; validated before warehouse load.
6. **No PHI in logs, traces, error messages, URLs, or analytics events.**
7. **Backup and recovery:** encrypted backups, tested restore, defined RPO/RTO per tier, never copied to an unapproved jurisdiction.

### 10.4 AI architecture

```
Approved Content Registry (versioned, jurisdiction-scoped, human-reviewed)
        |
Retrieval layer -> PHI redaction -> Model gateway (allowlisted model) -> Output classifier
        |
Draft artefact -> [Class A auto-audit | Class B/C named human approval] -> Applied action
        |
Evaluation suite + audit log + kill switch
```

- Retrieval corpus limited to approved clinical/administrative reference content with source and review date.
- No patient-specific data in retrieval by default.
- External model calls redact identifiers; country policy may prohibit external calls entirely.
- Output classifier enforces the allowlist/denylist in §5.9.
- Model registry version pins; unapproved model cannot be invoked.
- Every AI output has `draft` status until human action.
- Evaluation covers hallucination, unsafe clinical output, bias across languages, prompt injection, and refusal behaviour.

### 10.5 Non-functional targets (planning assumptions, to be validated)

| Area | Design target |
|---|---|
| Availability | Tiered; patient-facing core higher than reporting |
| Latency | Local-region serving; low-bandwidth client budgets |
| RPO/RTO | Defined per service tier and residency zone; clinical record most stringent |
| Scalability | Horizontal services; country data planes scale independently |
| Accessibility | WCAG 2.1 AA design target where applicable |
| Observability | Structured audit logs, metrics, traces with no PHI; alerting on fail-closed events |
| Cost | Per-country cost envelope tracked; no unapproved spend |

---

## 11. Integrations and API catalogue

### 11.1 Integration categories

All integrations are design targets. No integration is active, contracted, or implied.

| Category | Examples of capability | Status |
|---|---|---|
| Identity | OIDC/SSO, MFA, phone/email OTP | To be selected per country |
| Credential verification | National medical/dental/pharmacy registries and council lists | Source TBC; must be contracted and validated |
| Payments | PSPs, mobile money, bank transfer, USSD payment | TBC; no card data stored by EMDO |
| Messaging | SMS, email, in-app, voice/IVR | TBC; provider agreements required |
| Health interoperability | FHIR R4 / HL7 v2 exchange, SMART-on-FHIR design target | Design only |
| Pharmacy systems | Stock, ordering, dispensing records | TBC per pharmacy |
| Lab systems | LIS ordering, sample status, results | TBC per lab |
| Insurer/claims | Claims submission where authorised | TBC; not an insurer by default |
| Logistics | Courier tracking, cold-chain telemetry | TBC |
| Mapping | Geocoding, route and coverage checks | TBC |
| Translation | Human-reviewed workflow plus machine draft | Design only |

### 11.2 Integration principles

1. All partner calls use signed requests, mTLS where supported, timeouts, retries with idempotency, and circuit breakers.
2. No partner receives PHI without an active consent grant, legal basis, and logged purpose.
3. Webhooks verified by signature; replay protection; no PHI in payload metadata.
4. Fail-closed on verification or licence-check failure for clinical/commercial actions.
5. Every external data flow has a data-flow record and country-residency assessment.

### 11.3 API catalogue (design contract)

| ID | Method | Path | Purpose | Auth | PHI | Human approval |
|---|---|---|---|---|---|---|
| API-01 | POST | `/v1/patients` | Create patient account | Patient OTP | Minimal | No |
| API-02 | POST | `/v1/consents` | Create purpose/time-bound grant | Patient, step-up | Yes | Patient action |
| API-03 | DELETE | `/v1/consents/{id}` | Revoke grant | Patient, step-up | No | Patient action |
| API-04 | GET | `/v1/patients/{id}/record` | Read record in granted scope | Verified clinician + grant | Yes | Grant required |
| API-05 | POST | `/v1/records/entries` | Add record entry | Patient or verified clinician | Yes | Clinician for clinical entry |
| API-06 | PATCH | `/v1/records/entries/{id}` | Correct entry (append version) | Authorised human | Yes | Yes for clinical |
| API-07 | POST | `/v1/documents` | Upload document | Patient | Yes | Patient confirms extraction |
| API-08 | POST | `/v1/providers/applications` | Provider applies | Applicant | Identity docs | Compliance review |
| API-09 | POST | `/v1/verification/checks` | Trigger verification check | Compliance staff | Minimal | Human for decision |
| API-10 | GET | `/v1/providers` | Search verified providers | Any authenticated | No | No |
| API-11 | POST | `/v1/appointments` | Book appointment | Patient | Minimal | No |
| API-12 | PATCH | `/v1/appointments/{id}` | Reschedule/cancel | Patient/clinic | Minimal | No |
| API-13 | POST | `/v1/consults` | Start consult session | Verified clinician + patient | Yes | Consent |
| API-14 | POST | `/v1/consults/{id}/notes` | Add clinical note | Verified clinician | Yes | Clinician signs |
| API-15 | POST | `/v1/prescriptions` | Issue prescription | Verified licensed prescriber | Yes | Clinician signs |
| API-16 | POST | `/v1/pharmacies/applications` | Pharmacy applies | Applicant | Licence docs | Human approval |
| API-17 | GET | `/v1/pharmacies/{id}/catalogue` | View licensed catalogue | Any authenticated | No | No |
| API-18 | POST | `/v1/orders` | Create pharmacy order | Patient | Minimal | No |
| API-19 | POST | `/v1/orders/{id}/verify` | Pharmacist verifies prescription | Pharmacist-in-charge | Yes | Pharmacist sign-off |
| API-20 | POST | `/v1/labs/applications` | Lab applies | Applicant | Licence docs | Human approval |
| API-21 | POST | `/v1/test-requests` | Request diagnostic test | Verified clinician / lawful direct | Yes | Clinician where required |
| API-22 | POST | `/v1/samples/{id}/events` | Custody/temperature event | Lab/logistics | Minimal | No |
| API-23 | POST | `/v1/results/{id}/release` | Release result | Authorised lab professional | Yes | Named human required |
| API-24 | POST | `/v1/payments/intents` | Initiate payment | Patient/employer | Minimal | No |
| API-25 | POST | `/v1/refunds` | Request refund | Authorised staff | Minimal | Approval above threshold |
| API-26 | POST | `/v1/ai/drafts` | Generate AI draft | Authorised staff | Redacted only | Human for B/C |
| API-27 | POST | `/v1/ai/drafts/{id}/approve` | Approve AI draft | Named approver | Context | Yes |
| API-28 | GET | `/v1/insight/reports` | Aggregate report | BI role | De-identified only | Export approval |
| API-29 | POST | `/v1/incidents` | Report incident/adverse event | Any authenticated | Minimal | Human triage |
| API-30 | GET | `/v1/audit/events` | Query audit evidence | Audit/compliance | No PHI | Logged access |

**Conventions:** idempotency keys on all mutations; request IDs propagated; errors never echo PHI; rate limiting per role; field-level authorisation on reads; all class B/C endpoints reject AI principals.

---

## 12. Security and privacy requirements

### 12.1 Security controls

| Area | Requirement |
|---|---|
| Authentication | OIDC/OAuth 2.0; MFA mandatory for privileged, provider, pharmacy and lab accounts; step-up for sensitive actions |
| Authorisation | RBAC + ABAC with country, organisation, consent, purpose and assurance dimensions; deny by default |
| Encryption | TLS 1.3 in transit; AES-256 at rest; envelope encryption; managed keys with rotation; mTLS internal |
| Secrets | Managed secret store; no secrets in code/images; rotation and audit |
| Network | Private subnets for data services; WAF at edge; segmented environments |
| Application security | Secure SDLC, threat modelling, SAST/DAST/SCA, dependency pinning, code review, signed builds |
| Audit | Append-only, tamper-evident, retained per policy; no PHI in audit payloads |
| Monitoring | Alerting on verification failure, unusual access, AI policy violations, payment anomalies |
| Penetration testing | Independent test before pilot and before production; findings remediated and evidenced |
| Incident response | Documented playbook, named commander, notification timelines per jurisdiction |

### 12.2 Privacy controls

| Principle | Implementation |
|---|---|
| Purpose limitation | Consent is purpose-specific; reuse requires new consent or legal basis |
| Data minimisation | Collect only what the journey needs; no clinical data for basic discovery |
| Transparency | Layered privacy notice in local language; record of what was shared |
| Patient control | View, correct, export, withdraw, delete where lawful; documented exceptions |
| Retention | Schedule per data class and jurisdiction; automatic enforcement with legal holds |
| De-identification | Validated pipeline before analytics; suppression of small cells |
| DPIA | Required before any new high-risk processing, new country, or new AI function |
| Third parties | Data processing agreements; no secondary use; sub-processor register |
| Children | Guardian authority verification; age-appropriate design; privacy preserved as child ages |
| Break-glass | Reason code, time limit, automatic expiry, post-event review |

### 12.3 Sensitive operation approval matrix

| Operation | Approver | Second approver |
|---|---|---|
| Publish provider profile | Compliance officer | No (but evidence required) |
| Suspend/revoke provider | Compliance officer | Yes |
| Release lab result | Authorised lab professional | No (clinical role is the control) |
| Sign clinical note/prescription | Verified clinician | No (clinical role is the control) |
| Change clinical record by admin | Clinical governance owner | Yes |
| Refund/payout above threshold | Finance officer | Yes |
| Cross-border data transfer | Privacy officer | Legal reviewer |
| Delete patient record | Privacy officer | Legal/clinical reviewer where retention applies |
| Activate country | Owner | Legal + clinical + security reviewers |
| Deploy new AI function | Product owner | Clinical safety + compliance + security |

---

## 13. Legal and clinical risk register

> This is a design risk register, not legal advice. Qualified counsel and clinical governance must validate each item per jurisdiction before activation.

| ID | Risk | Impact | Mitigation | Gate |
|---|---|---|---|---|
| R01 | Unverified person provides clinical advice | Patient harm, regulatory breach | Hard verification gate; fail-closed endpoints; re-verification; immediate suspension | Doctor verification source contracted and tested |
| R02 | Unlicensed pharmacy sells medicines | Legal breach, patient harm | Licence/site verification at onboarding, order and dispatch; expiry suspension | Legal opinion per country |
| R03 | Prescription issued without valid licence or jurisdiction | Legal breach | Prescriber licence + country check; human sign; cross-border block | Telehealth jurisdiction mapping |
| R04 | AI gives diagnosis or prescription | Patient harm | Denylist, output classifier, no AI approver, evaluation suite, kill switch | AI safety review before any pilot |
| R05 | AI hallucinated reference content | Misinformation | Approved content registry, source display, human review, refusal behaviour tests | Content set versioned and signed |
| R06 | Patient data breach | Harm, regulatory penalty | Encryption, least privilege, DLP, pen test, incident plan | Security evidence before pilot |
| R07 | Invalid consent or shared-device exposure | Privacy breach | Step-up auth, comprehension testing, granular grants, quick-exit | Localised consent review |
| R08 | Cross-border transfer without legal basis | Regulatory breach | Residency architecture, transfer assessment, dual approval | Country activation gate |
| R09 | Employer accesses individual clinical data | Privacy breach, discrimination | Aggregation only, threshold suppression, no default access | Corporate contract review |
| R10 | Lab result released incorrectly | Patient harm | Named authorised releaser, versioned corrections, critical-flag escalation | Lab SOP approval |
| R11 | Sample chain-of-custody failure | Wrong result | Custody IDs, temperature logs, exception handling | Lab workflow validation |
| R12 | Adverse event not reported | Regulatory breach | Reporting channel, named owner, statutory timeline tracking | Pharmacovigilance process approved |
| R13 | Payment fraud, chargebacks, payout errors | Financial loss | PSP, ledger, idempotency, dual approval, reconciliation | Financial controls sign-off |
| R14 | Kickback/referral arrangement | Anti-bribery breach | No referral payments; disclosure; commission on fulfilment only | Commercial policy review |
| R15 | Unlawful health/medical advertisement | Regulatory breach | Claims review, labelled sponsorship, prescription-medicine ad restrictions | Marketing release gate |
| R16 | Platform implied to be emergency service | Patient harm | Explicit disclaimers, red-flag routing to emergency care, no emergency SLA claim | Clinical safety review |
| R17 | Data copied from reference companies | IP infringement | Clean-room rules, provenance records, legal review | Asset provenance check |
| R18 | Unlicensed insurance-like plan | Regulatory breach | Legal review of plan wording; no insurance claim without licence | Product launch gate |
| R19 | Minors' data mishandled | Privacy/harm | Guardian authority check, age-appropriate privacy, jurisdiction rules | Child-safety review |
| R20 | Service outage during care | Patient harm | Tiered resilience, offline record access, failover, incident comms | Reliability evidence |
| R21 | Unverified credentials displayed | Fraud | Verification source and date displayed; no self-declared badge | Directory publish gate |
| R22 | Corruption of clinical history | Patient harm | Append-only versions, attribution, dispute workflow | Record integrity testing |
| R23 | AI training on patient data without basis | Privacy breach | Default off, separate consent, de-identification, decision record | Privacy review |
| R24 | Controlled substance mishandled | Legal/criminal risk | Excluded by default until dedicated legal and control system | Explicit board/legal approval |
| R25 | Unclear accountability between platform and provider | Liability | Terms defining roles (controller/processor/provider), documented SOPs | Contract review |

---

## 14. Financial assumptions

> **Every figure in this section is a planning assumption (unvalidated, uncited). No figure is reported performance, investor evidence, a validated market estimate, or an offer. Downside/base/upside are planning scenarios, not statistical confidence intervals. All values must be rebuilt from country-level cost and pricing evidence before any external use.**

### 14.1 Model definitions

| Metric | Definition |
|---|---|
| Registered users | Accounts created; not active patients |
| Paying subscribers | Accounts with an active paid plan at period end |
| Consultations | Completed verified clinician encounters |
| GMV | Gross value of consultation, pharmacy and lab orders before payouts, refunds and taxes |
| Net revenue | Platform revenue after provider/pharmacy/lab payouts and agreed shares |
| Take rate | Net revenue / GMV |
| Contribution margin | Net revenue less variable fulfilment, payment cost and directly attributable acquisition, divided by net revenue |
| CAC | Acquisition spend / newly acquired registered users in the period |

### 14.2 Illustrative planning scenarios

| Horizon | Metric | Downside | Base (planning) | Upside |
|---|---|---:|---:|---:|
| Year 1 (first full commercial year, assumed) | Registered users | 80,000 | 180,000 | 320,000 |
| Year 1 | Paying subscribers | 6,000 | 14,000 | 28,000 |
| Year 1 | GMV | $3.0M | $7.5M | $14.0M |
| Year 1 | Net revenue | $0.4M | $1.1M | $2.2M |
| Year 1 | Take rate | 10% | 14% | 17% |
| Year 3 | Registered users | 350,000 | 800,000 | 1.4M |
| Year 3 | Paying subscribers | 40,000 | 95,000 | 180,000 |
| Year 3 | GMV | $18M | $42M | $80M |
| Year 3 | Net revenue | $2.6M | $6.3M | $13M |
| Year 3 | Take rate | 12% | 15% | 17% |
| Year 5 | Registered users | 1.0M | 2.4M | 4.5M |
| Year 5 | Paying subscribers | 130,000 | 320,000 | 620,000 |
| Year 5 | GMV | $60M | $150M | $300M |
| Year 5 | Net revenue | $8M | $23M | $51M |
| Year 5 | Take rate | 13% | 15% | 17% |

**Revenue mix at Year 5 (planning assumption):** subscriptions 30%, corporate 20%, pharmacy commission 17%, lab commission 12%, consultations 10%, provider SaaS 7%, analytics/API 3%, other 1%. No advertising revenue is assumed until a compliant policy is approved.

### 14.3 Unit-economics guardrails (planning assumptions)

| Guardrail | Downside | Base | Upside |
|---|---:|---:|---:|
| Blended CAC ceiling | $18 | $12 | $8 |
| Monthly subscriber churn ceiling | 8% | 5% | 3% |
| Contribution margin floor | 35% | 50% | 60% |
| Verification cost per provider | $25 | $12 | $6 |
| Payment cost as % of GMV | 4.5% | 2.8% | 1.8% |

### 14.4 Cost categories to model per country

Legal and licensing; verification sources; clinical governance; local hosting and residency; PSP/mobile-money fees; SMS/voice; human translation and clinical review; support staffing; insurance; security testing; data protection officer; logistics/cold chain; taxes; facility partnerships; training.

### 14.5 Financial governance

1. No financial figure may be published externally without finance review and an evidence record.
2. No "savings", "ROI", "reduced cost", or "improved outcome" claim may be made without clinical/health-economics evidence and legal review.
3. Scenario changes require a new decision record and version bump.
4. Revenue recognition and ledger design must be approved before any live payment.

---

## 15. Phased implementation roadmap

> Dates are planning assumptions and depend on owner approval. No code is authorised before Phase 0 exit.

### Phase 0 — Owner approval and foundations (target: months 0–3)

**Objective:** decide what EMDO is, where it starts, and under what authority.

- Review and approve this specification and `DECISION_LOG.md`.
- Choose initial country/countries and legal entity structure.
- Appoint clinical governance lead and compliance lead (real, named, documented — no invented credentials).
- Identify provider, pharmacy and lab verification sources; begin legal scoping.
- Complete jurisdiction legal memos and DPIA scope.
- Define canon, ADR process, claim-review process and evidence register.
- Establish brand name usage, asset provenance policy, and clean-room separation.
- **Exit gate:** signed owner approval; decision records for scope, country, safety constitution and architecture principles; no open C-rule conflicts.

### Phase 1 — Design and closed prototype (target: months 3–6)

**Objective:** prove workflows with synthetic data, no external side effects.

- Prototype M1 record, M2 directory, M5/M6 catalogue shells, M9 draft-only AI, M10 internal dashboards.
- Synthetic providers, pharmacies, labs and patients only; clearly labelled "demo".
- Implement consent model, verification state machine, audit skeleton and AI allowlist/denylist.
- Build evaluation suite for AI safety and localisation quality.
- **Exit gate:** all flows run locally with synthetic data; no PHI, no live payments, no real clinical actions; security design review and legal review recorded.
- **NO-GO conditions:** any real patient data, any real prescription, any unverified provider shown, any AI output applied without human review.

### Phase 2 — Single-country restricted pilot (target: months 6–12)

**Objective:** controlled live operation with verified participants.

- One approved country profile; named operators; limited cohort.
- Real provider verification; clinic onboarding; telehealth under clinical governance.
- Licensed pharmacy and lab participation with signed agreements.
- Payments via approved PSP/mobile money; dual approval for payouts/refunds.
- Full audit, incident response, consent enforcement and human approval workflows.
- **Exit gate:** evidence pack covering verification, licences, security test, privacy review, clinical safety, payment reconciliation, support readiness, AI evaluation and owner sign-off.
- **NO-GO conditions:** missing verification source, missing licence evidence, unresolved critical security findings, unapproved AI function, no clinical governance owner.

### Phase 3 — Multi-country expansion (target: months 12–18)

**Objective:** add countries one at a time through the activation gate.

- Second and third country profiles; in-country residency; local languages and payment methods.
- Cross-country rules tested; provider and facility licences scoped per jurisdiction.
- Corporate plans and family subscriptions expanded after legal review.
- **Exit gate:** each country independently passes the activation gate; no blanket approval.

### Phase 4 — Production-scale operation (target: months 18–24+)

**Objective:** public launch only where approved.

- Open patient access in approved countries; scaled support and reliability.
- Advanced analytics and approved AI administration functions.
- Continuous verification, audit, DSAR, pharmacovigilance and incident programmes.
- **Exit gate:** production launch record signed by owner, legal, clinical, security and finance; post-launch monitoring plan active.

### Roadmap rules

1. A phase cannot close with "design" evidence where "pilot" evidence is required.
2. Each gate requires named approvers and dated evidence.
3. Documentation changes never promote maturity state.
4. Any rule change in §2 requires re-approval of this entire specification.
5. No marketing or public claim may reference a capability above its demonstrated maturity state.

---

## 16. Launch-readiness checklist

> Mark items only with dated evidence reference. "Planned" is not "done". Every unchecked item blocks launch in its scope.

### Governance and documentation
- [ ] Owner approval of master specification recorded with date and scope (`DECISION_LOG.md`)
- [ ] Canon / single source of truth accepted; all documents consistent
- [ ] Decision log complete for all architectural, product, pricing and clinical-safety decisions
- [ ] ADR process active with at least the core decisions recorded
- [ ] Claim-review workflow with two-person approval documented
- [ ] Maturity state of every module published internally and externally consistent

### Legal and regulatory
- [ ] Jurisdiction legal memo per launch country, signed by qualified counsel
- [ ] Data-protection law mapping and DPO/privacy owner appointed
- [ ] Provider, pharmacy and lab licensing requirements documented
- [ ] Terms defining roles between platform, providers, pharmacies and labs
- [ ] Advertising and health-claims review process active
- [ ] Plan wording reviewed; no unlicensed insurance claim
- [ ] Cross-border rules documented and technically enforced
- [ ] IP provenance check complete for all assets; clean-room separation confirmed

### Clinical safety
- [ ] Clinical governance lead appointed with verified credentials and documented scope
- [ ] Provider verification against authoritative source tested and re-verification scheduled
- [ ] Pharmacy licence and pharmacist-in-charge verification tested
- [ ] Lab licence/accreditation and authorised result-release list tested
- [ ] Red-flag/emergency routing reviewed by clinician
- [ ] Adverse-event reporting workflow with statutory timelines approved
- [ ] Critical-result escalation workflow tested
- [ ] No AI-generated diagnosis/prescription verified by test evidence and code review
- [ ] Clinical content set versioned and human-reviewed per jurisdiction

### Product and UX
- [ ] Consent comprehension tested in launch languages
- [ ] Offline/low-bandwidth flows tested on target devices
- [ ] Family authority and guardian checks tested
- [ ] Employer aggregate-only access verified
- [ ] Accessibility review completed
- [ ] All disclaimers and exclusions visible at point of use

### Security and privacy
- [ ] Independent penetration test completed; critical/high findings remediated
- [ ] Encryption, key management and rotation verified
- [ ] MFA and step-up authentication enforced for required roles
- [ ] ABAC policy tests covering country, organisation, consent and purpose
- [ ] PHI scan of logs, telemetry, analytics and error messages passed
- [ ] Audit immutability and retention verified
- [ ] DPIA completed for launch scope
- [ ] Backup/restore and residency tests passed
- [ ] Incident response playbook exercised in a drill
- [ ] DSAR workflow tested end-to-end

### Payments and finance
- [ ] PSP/mobile-money agreements executed; no card data stored by EMDO
- [ ] Ledger, reconciliation, refunds and payout dual approval tested
- [ ] Pricing and benefit version records approved
- [ ] Financial assumptions register reviewed; no unlabelled projections in public material
- [ ] Tax and receipt requirements validated per country

### AI and data
- [ ] AI allowlist/denylist enforced by policy, not convention
- [ ] Human approval gate tested for all class B/C outputs
- [ ] Model registry pins approved versions; kill switch tested
- [ ] PHI redaction before external model calls verified
- [ ] Evaluation report recorded; no marketing use without review
- [ ] De-identification validation and small-cell suppression passed
- [ ] No patient data used in training without separate consent and decision record

### Operations
- [ ] Named operational owners for support, compliance, clinical, security, finance
- [ ] Local-language support coverage and hours defined
- [ ] Provider/pharmacy/lab onboarding runbooks tested
- [ ] Service-level commitments reviewed and not overclaimed
- [ ] Monitoring and alerting active with PHI-safe telemetry
- [ ] Post-launch review schedule established

### Final launch gate
- [ ] Owner sign-off recorded with explicit launch scope and date
- [ ] Legal sign-off recorded
- [ ] Clinical sign-off recorded
- [ ] Security/privacy sign-off recorded
- [ ] Finance sign-off recorded
- [ ] Maturity state promoted to Pilot or Production only after all above evidence is attached

---

## 17. Open questions requiring owner decision

These are not resolved by this document. Each needs an owner decision before Phase 0 can close.

| ID | Question | Why it matters | Proposed default if owner agrees |
|---|---|---|---|
| Q01 | Which country launches first? | Determines law, residency, verification sources, language and payment | One country only; no multi-country pilot initially |
| Q02 | What legal entity will hold data and contracts? | Controller/processor roles and liability | Country entity or locally compliant structure per counsel |
| Q03 | Is EMDO an insurer, a benefits platform, or neither? | Corporate plan legality | Neither; no insurance claim until licensed |
| Q04 | Are prescription medicines in scope at launch? | Pharmacy legal complexity | Yes only with licensed pharmacies and valid prescriptions; controlled substances excluded |
| Q05 | Is telehealth in scope at launch? | Clinical and cross-border rules | Only with verified clinicians and jurisdiction mapping |
| Q06 | Will AI call external models with patient-adjacent data? | Residency and privacy | No identifiable PHI externally; country-level prohibition possible |
| Q07 | Which languages are in the first release? | Translation and clinical review cost | Languages of the first country plus English/French as needed |
| Q08 | What is the brand tagline and visual identity? | Provenance and IP risk | To be created clean-room; no reference-company resemblance |
| Q09 | Who are the named clinical and compliance leads? | Clinical governance is mandatory | Must be real, verified individuals; none claimed here |
| Q10 | What is the initial budget and runway? | Determines roadmap realism | Planning assumption only until finance approves |
| Q11 | Are home sample collection and medicine delivery in scope? | Logistics and licensing | Only where lawful and with licensed partners |
| Q12 | Is an employer aggregate dashboard required in Phase 2? | Corporate design scope | Deferred to Phase 3 unless required for pilot economics |

---

## Appendix A — canonical vocabulary and data objects

### A.1 Module names (use exactly)

EMDO Record · EMDO Care · EMDO Telehealth · EMDO Practice · EMDO Pharmacy · EMDO Labs · EMDO Family · EMDO Corporate · EMDO Assist · EMDO Insight.

### A.2 Core data objects

| Object | Key attributes | Sensitivity |
|---|---|---|
| `Patient` | country, assurance level, identity documents, preferences | Personal / PHI |
| `ConsentGrant` | patient, purpose, scope, expiry, grantor, revocation | Sensitive |
| `RecordEntry` | type, source, author, version, timestamp, clinical flag | PHI |
| `Document` | encrypted object reference, checksum, classification | PHI |
| `ProviderProfile` | identity, credentials with source and date, jurisdictions, status | Personal / regulated |
| `Facility` | licence, site, departments, staff, jurisdiction | Regulated |
| `Appointment` | patient, provider, slot, channel, status, reason | Sensitive |
| `Consult` | participants, consent, note, signed state, prescription refs | PHI |
| `Prescription` | prescriber, patient, items, jurisdiction, signature | PHI / regulated |
| `PharmacyOrder` | pharmacy, items, prescription check, pharmacist sign-off, dispatch | PHI / regulated |
| `LabRequest` | requester, test, patient, preparation | PHI |
| `Sample` | custody ID, timestamps, temperature events, chain | PHI / regulated |
| `LabResult` | lab, releaser, version, critical flag, release timestamp | PHI |
| `Subscription` | plan, member, dependants, billing status, benefits | Personal / financial |
| `Claim` | member, provider, items, status, payer | PHI / financial |
| `AuditEvent` | actor, action, object, purpose, decision, timestamp, evidence | Sensitive |
| `AIDraft` | model, version, input hash, output hash, class, approver, state | Sensitive |
| `CountryProfile` | jurisdiction, residency, verification sources, gates, status | Config |

### A.3 Status enums

- Provider verification: `unverified | submitted | under_review | verified | suspended | revoked`
- Facility/licence: `unsubmitted | under_review | active | expired | suspended | revoked`
- Consent grant: `active | expired | revoked | superseded`
- AI draft: `draft | approved | rejected | applied | reversed`
- Country activation: `planned | ready_for_review | approved | suspended | retired`
- Order: `created | verification_pending | verified | packing | dispatched | delivered | cancelled | refunded`

### A.4 Evidence standards

1. An evidence record contains: ID, claim, source type, date, owner, jurisdiction, confidence, and review status.
2. Measured claims require a data source and collection method; planning claims are labelled as such.
3. No module maturity state changes without an evidence record and approver signatures.
4. External communication inherits the most conservative label attached to its underlying claim.

---

**End of master specification. No implementation is authorised until owner approval is recorded in `DECISION_LOG.md`.**
