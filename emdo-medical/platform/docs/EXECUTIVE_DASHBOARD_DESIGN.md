# EMDO Medical — M10 Insight and Super Admin executive dashboard design

> **Status: design document; M10 aggregate API implemented under D-025 and the local Next.js Super Admin portal implemented under D-026, both Prototype.** D-024 authorised architecture, role definitions, metric definitions and workflow design. D-025 authorised the M10 aggregate API; D-026 authorised only the local portal client. Both have local test evidence in `packages/shared/src/status.ts`. No hosted client, business-source migration, data seeding, external integration, export execution or live financial metric was authorised. No healthcare, revenue, expense, incident or expansion figure in this document is a measured EMDO result.

## 1. Scope boundary

### In scope for D-024

- Central management and executive dashboard architecture.
- Role catalogue and least-privilege permission matrix for the 12 requested roles.
- Versioned metric definitions with formula, source, owner and evidence status.
- Explicit handling of metrics whose source modules do not exist.
- Sensitive-operation approval workflow design.
- Daily, weekly and monthly CEO report templates.
- Dashboard information architecture and test/evidence plan.

### Out of scope until separately approved

| Item | Reason |
|---|---|
| Implementation of the M10 Insight API | Implemented as Prototype by D-025; still no business source modules |
| Hosted Next.js Super Admin dashboard | A local prototype client was implemented by D-026; hosting, MFA and export remain unauthorised |
| New database migrations or aggregate tables | Requires an implementation decision and reviewed migration |
| Clinical, pharmacy, laboratory, billing or SIEM integrations | Source modules M3–M8 are Design-only; no integration exists |
| Any generated business metric presented as measured performance | No trusted source exists for most requested domains |
| Any employee access to row-level patient records | Prohibited without a separate governance decision and audited workflow |

## 2. Module and platform mapping

| Requested capability | Maps to | Current state |
|---|---|---|
| Central management and executive dashboard | Next.js Super Admin platform | Prototype — local client under D-026; not hosted |
| Aggregate business intelligence API | M10 EMDO Insight | Prototype — aggregate API under D-025; no business sources |
| AI agent activity | M9 API metrics already implemented | Prototype; available locally |
| Verified doctors | M2 provider directory | Prototype; manual review only, not authoritative verification |
| Patient counts | Foundation identity data | Prototype; aggregate counts only, no identities in BI |
| Clinics, hospitals, pharmacies, labs, subscriptions, revenue, expenses, incidents | M4–M8 and unbuilt finance/security systems | Design or absent; no data source |

M10 must read from a **de-identified aggregate boundary** only. It must not query `clinical_records`, decrypted record payloads, raw identifiers or any endpoint that returns row-level PHI. The M9 metrics API remains a source for AI activity and must not be widened into a PHI surface.

## 3. Data source and evidence matrix

`UNAVAILABLE_NO_SOURCE` means the API returns an explicit unavailable status with the metric definition ID and evidence status. It must never return `0`, an estimate, a vendor figure or a trend.

| Capability | Intended source | Current status | Evidence rule |
|---|---|---|---|
| Total registered patients | `users` + `user_roles` where role `patient` | AVAILABLE_WITH_CAVEAT | De-identified count only; sandbox/test accounts excluded from any business claim |
| Verified doctors | `provider_profiles.verification_status = 'verified'` | AVAILABLE_WITH_CAVEAT | Must be labelled `sandbox_manual_verification`; never presented as authoritative verification |
| Clinics and hospitals | M4 EMDO Practice | UNAVAILABLE_NO_SOURCE | No facility register exists |
| Registered pharmacies | M5 EMDO Pharmacy | UNAVAILABLE_NO_SOURCE | No licensed pharmacy register exists |
| Diagnostic partners | M6 EMDO Labs | UNAVAILABLE_NO_SOURCE | No laboratory partner register exists |
| Subscription revenue | Billing/ledger from M7/M8 | UNAVAILABLE_NO_SOURCE | No pricing, invoice or ledger integration exists |
| Transaction revenue | Payment ledger | UNAVAILABLE_NO_SOURCE | No payment provider or tested ledger exists |
| Country-level performance | Composite of the above | PARTIAL_ONLY | Show only available sub-metrics; all others marked unavailable |
| Platform operating expenses | Finance ledger | UNAVAILABLE_NO_SOURCE | No expense source exists |
| Growth | `users.created_at` registration cohorts | AVAILABLE_WITH_CAVEAT | Registration growth only; not customer acquisition spend or conversion |
| Retention | Subscription/activity events | UNAVAILABLE_NO_SOURCE | No retention event stream exists |
| AI agent activity | `ai_interactions`, M9 metrics API | AVAILABLE_TESTED | Aggregate counts by agent/outcome; no prompt text |
| Security incidents | SIEM/incident register | UNAVAILABLE_NO_SOURCE | Audit events are not incident evidence |
| Compliance alerts | Policy engine + verification events | BLOCKED_BY_GOVERNANCE | No approved alert rules; verification events alone are not alerts |
| Expansion opportunities | Country profiles + approved market data | UNAVAILABLE_NO_SOURCE | Country profiles are configuration, not market evidence |

## 4. Versioned metric catalogue

Evidence status values: `AVAILABLE_TESTED`, `AVAILABLE_WITH_CAVEAT`, `PARTIAL_ONLY`, `UNAVAILABLE_NO_SOURCE`, `BLOCKED_BY_GOVERNANCE`.

Minimum cell size **10** is proposed for de-identified group output and requires privacy sign-off before implementation. Cells below the threshold are suppressed; complementary differences are blocked so suppressed values cannot be reconstructed. No patient, doctor, facility or employee may be identified in a dashboard.

| Metric ID | Definition / formula | Grain | Owner role | Evidence status |
|---|---|---|---|---|
| `M10-M001` | Count of active users with role `patient`, excluding test tenants | Country, month | CEO / Super Admin | AVAILABLE_WITH_CAVEAT |
| `M10-M002` | Count of provider profiles with `verification_status='verified'` | Country, month | Medical Director | AVAILABLE_WITH_CAVEAT |
| `M10-M003` | Count of current clinic/hospital facilities | Country | Operations Manager | UNAVAILABLE_NO_SOURCE |
| `M10-M004` | Count of licensed pharmacy accounts | Country | Pharmacy Verification Officer | UNAVAILABLE_NO_SOURCE |
| `M10-M005` | Count of diagnostic/laboratory partners | Country | Medical Director | UNAVAILABLE_NO_SOURCE |
| `M10-M006` | Recognised subscription revenue in period | Country, month | Finance Manager | UNAVAILABLE_NO_SOURCE |
| `M10-M007` | Recognised transaction revenue in period | Country, month | Finance Manager | UNAVAILABLE_NO_SOURCE |
| `M10-M008` | Operating expenses in period | Country, month | Finance Manager | UNAVAILABLE_NO_SOURCE |
| `M10-M009` | Registered-patient cohort growth by month | Country, month | Marketing Manager | AVAILABLE_WITH_CAVEAT |
| `M10-M010` | Active-subscriber retention by cohort | Country, cohort | Finance Manager | UNAVAILABLE_NO_SOURCE |
| `M10-M011` | AI interactions by agent, capability and outcome | Country, day/week/month | Technical Administrator | AVAILABLE_TESTED |
| `M10-M012` | Confirmed security incident count | Country, period | Technical Administrator | UNAVAILABLE_NO_SOURCE |
| `M10-M013` | Open compliance alerts by policy and severity | Country, period | Compliance Officer | BLOCKED_BY_GOVERNANCE |
| `M10-M014` | Expansion opportunity score | Country, quarter | CEO / Super Admin | UNAVAILABLE_NO_SOURCE |

Every response carrying a metric must include `metricId`, `metricVersion`, `evidenceStatus`, `sourceStatus`, `generatedAt` and `suppressed` flags. A metric definition may not change without a reviewed version increment and named owner.

## 5. Role catalogue and permission matrix

### Canonical role additions

The implementation must add the following to the shared role vocabulary when D-024 is approved for coding: `super_admin`, `country_administrator`, `operations_manager`, `medical_director`, `finance_manager`, `doctor_verification_officer`, `pharmacy_verification_officer`, `laboratory_verification_officer`, `customer_support_manager`, `marketing_manager`, `technical_administrator`. `compliance_officer` already exists. `platform_admin` remains the technical platform role and is **not** synonymous with CEO / Super Admin.

### Universal prohibitions

- No role in this catalogue may read `clinical_records`, decrypted record content, record versions or any endpoint returning row-level PHI through the dashboard.
- Existing record access remains patient/caregiver-only; clinical roles remain blocked by `RecordService.assertRole()` until a separate governance decision.
- No AI principal is an approver or final decision maker.
- No role may bypass a sensitive-operation workflow by holding a broader role.

### Permission matrix (proposed; requires approval before implementation)

| Role | Report groups viewable | Sensitive actions |
|---|---|---|
| CEO / Super Admin (`super_admin`) | All report groups; final strategic decision authority | May **request** financial, suspension and export actions; may approve only where not requester; cannot approve clinical actions unless separately appointed Medical Director |
| Country Administrator (`country_administrator`) | Country-scoped operations, growth, AI, unavailable-source register | May request user suspension and country report export; cannot approve own request |
| Operations Manager (`operations_manager`) | Operations, bottlenecks, country performance, utilisation placeholders | May request operational exports; no financial or clinical approval |
| Medical Director (`medical_director`) | Non-clinical provider performance, verification status, labs/pharmacy availability | May approve clinical review workflows; no patient record access; no clinical-outcome ranking without reviewed methodology |
| Compliance Officer (`compliance_officer`) | Compliance alerts register, audit summaries, policy gaps, all approval queues | May approve exports, suspensions and compliance alerts; cannot approve own request |
| Finance Manager (`finance_manager`) | Subscription/transaction revenue, operating expenses, profitability templates | May request transfers/refunds; may approve only with a different named finance/compliance approver |
| Doctor Verification Officer (`doctor_verification_officer`) | Doctor verification queue and status metrics | May request/approve doctor verification within two-person rule |
| Pharmacy Verification Officer (`pharmacy_verification_officer`) | Pharmacy verification availability and status | May request/approve pharmacy verification when M5 exists |
| Laboratory Verification Officer (`laboratory_verification_officer`) | Laboratory verification availability and status | May request/approve laboratory verification when M6 exists |
| Customer Support Manager (`customer_support_manager`) | Support workload and non-PHI service metrics | May request user suspension; no approval authority |
| Marketing Manager (`marketing_manager`) | Acquisition, registration growth, campaign drafts | May request marketing exports; no PHI and no individual-level analytics |
| Technical Administrator (`technical_administrator`) | AI activity, system health, security incident register availability | May request incident reviews; cannot view patient records or approve financial actions |

## 6. Sensitive operation workflows

All sensitive operations use the same tested pattern already proven in M2/M9: `requested → under_review → approved | rejected → executed_by_named_human`, with a coded reason, evidence reference, fresh authentication, append-only audit and requester/approver separation. AI may not appear as requester, approver, signer or executor of a final decision.

| Operation | Requester | Required approver | Notes |
|---|---|---|---|
| Financial transfer | Finance Manager | Finance Manager + Compliance Officer, different users | No payment integration exists; workflow design only |
| Subscription refund | Customer Support Manager or Finance Manager | Finance Manager, different user | No billing ledger exists; workflow design only |
| Clinical approval | Director/verification officer with appropriate appointment | Medical Director | No autonomous clinical decision; no patient record access from this workflow |
| User suspension | Customer Support Manager / Country Administrator | Compliance Officer or Super Admin, different user | Coded reason; no free-text PHI |
| Doctor verification | Doctor Verification Officer | Second verification officer or Compliance Officer | Manual source gate remains in force |
| Pharmacy/Lab verification | Relevant verification officer | Second officer or Compliance Officer | Blocked until M5/M6 source modules exist |
| Report export | Any role with report view permission | Data owner role + Compliance Officer | Watermarked, expiring, append-only export audit |

**CEO authority:** the CEO/Super Admin is the final authority for strategic business decisions. This does not override clinical, legal, financial-control or privacy gates, and it does not permit self-approval or unilateral execution of a sensitive operation.

## 7. CEO report templates

Daily, weekly and monthly reports are generated from versioned metric definitions. Every section must print its evidence status. A section with no trusted source must state `UNAVAILABLE_NO_SOURCE` and the missing source module; it must not infer a value from adjacent metrics.

| Section | Required content | Source status |
|---|---|---|
| Business performance | Active patients, verified doctors, AI activity; all other domains marked unavailable | Partial |
| Revenue and profitability | Subscription revenue, transaction revenue, operating expenses | Unavailable |
| Customer acquisition | Registration growth; acquisition cost/conversion blocked | Partial |
| Subscription retention | Cohort retention | Unavailable |
| Operational bottlenecks | Verification queue and AI escalation summaries; facility/pharmacy/lab bottlenecks blocked | Partial |
| Country performance | Per-country available sub-metrics with suppressed small cells | Partial |
| Risks | Evidence-backed risk register entries only; no invented incidents | Unavailable until incident/policy sources exist |
| Opportunities | Expansion candidates marked design-only; no market claim | Unavailable |
| Management recommendations | Clearly labelled decision support for the CEO; final decision retained by CEO | Design-only until sources exist |

Report publication requires human review. Exports require approval and watermark. No clinical outcome or quality ranking may be produced without a documented, clinically reviewed methodology. No vendor-supplied benchmark may be presented as measured EMDO performance.

## 8. Technical architecture (design only)

- **API:** NestJS module `insight` with read-only aggregate endpoints: metric catalogue, metric values, report list, report detail, report generation, export request and approval endpoints.
- **Data boundary:** a separate aggregate store/views containing no identifiers and no encrypted record payloads. BI roles receive no privilege to join to `users`, `clinical_records`, `consent_grants` or provider credential tables.
- **Tenancy/country:** aggregate rows carry `country_code`; country administrators are restricted to their country; Super Admin may view all countries but still cannot access PHI.
- **Suppression:** proposed minimum group size 10, complement suppression and no small-cell differencing.
- **Audit:** append-only `insight_report_generated`, `insight_export_requested`, `insight_export_approved` and sensitive-operation events with allowlisted metadata only.
- **Client:** Next.js Super Admin dashboard with role-filtered navigation, evidence badges, explicit unavailable states and no patient-record pages. D-024 did not authorise it; D-026 subsequently authorised the local prototype only.
- **AI:** may summarise an already-approved report but cannot generate a final metric, approve a report, or make a strategic/financial/clinical decision.

## 9. Test and evidence plan

Before any implementation is called functional:

1. Unit tests for the role/permission matrix, metric definitions, suppression rules and sensitive-operation state machine.
2. E2E tests using synthetic-only data for role denial, PHI non-exposure, unavailable-source rendering, self-approval denial, export approval and audit assertions.
3. A de-identification review that proves BI queries cannot join to identifiable tables.
4. A report-golden test showing every unavailable section carries the correct evidence status and no fabricated number.
5. Promotion evidence recorded in `IMPLEMENTATION_STATUS.md`; documentation alone never changes a maturity state.

## 10. Gates and explicit non-claims

- D-024 was approved for design; D-025 authorised the aggregate API and D-026 authorised only the local portal client.
- Implementation order followed the approved sequence: **M10 aggregate API first**, then the Super Admin Next.js portal as a separately authorised workstream.
- M10 and the portal are **Prototype** only after their local gates pass; passing tests do not authorise hosting, source modules or sensitive operations.
- No count of clinics, pharmacies, labs, revenue, expenses, incidents, retention or expansion opportunities is claimed by this repository.
- No patient may be identifiable in any dashboard; no employee role gains medical-record access through this design.
