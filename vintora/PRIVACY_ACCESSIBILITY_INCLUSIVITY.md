# Vintora Privacy, Accessibility and Inclusivity Requirements

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.** Payments, age/KYC, AI, logistics and custody are simulated or deterministic behind adapters. No real personal data, live transaction or regulated activity is performed.

This document converts the canon's compliance-by-design differentiator into testable requirements. It is a control specification, not a claim that the controls pass today.

## Canon snapshot

| Fact | Value |
|---|---|
| Tagline | *The World's Cellar, Intelligent.* |
| Market-facing modules | Exactly ten: Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards |
| Internal layers | Admin Panel (19 workspaces, `ADM-01`…`ADM-19`), Global Payments, AI Marketing Automation, Ultimate AI TechOps (24 agents in `ADM-19`) |
| Localization target | en/fr/es UI; Africa registry en/fr/ar/pt/sw; RTL Arabic; 135+ currencies (target) |
| Accessibility target | WCAG 2.2 AA (design target, **not audited**) |
| Release posture | NO-GO; `NODE_ENV=production` rejected at startup |

---

## 1. Status vocabulary

| Status | Meaning |
|---|---|
| **Implemented in prototype** | Runnable locally with bundled demo data; not evidence of production compliance. |
| **Design requirement** | Normative requirement for a future release; no runtime enforcement today. |
| **Not yet verified** | Behaviour may exist but has no recorded test, audit or evidence artifact. |
| **Blocked** | Cannot be implemented or activated until a legal, provider or governance gate closes. |

---

## 2. Privacy-by-design requirements

| # | Requirement | Actionable control | Status | Verification method | Current gap |
|---|---|---|---|---|---|
| P1 | Data minimisation | Collect only fields required for the active flow; no date of birth beyond the age assertion result; no card data in the API. | Implemented in prototype (machine-checked inventory) | `npm run privacy:check`; schema review of `services/api/` migrations; field-by-field DPIA worksheet. | No signed field inventory or production collection enforcement. |
| P2 | Purpose limitation | Tag each table/column with a purpose in the data dictionary; reuse of taste-profile data for ads requires a separate, recorded purpose. | Implemented in prototype (evaluator) | `npm run privacy:check` and shared tests assert separate recommendation, marketing and experimentation purposes. | Production query-level cross-purpose joins not yet enforced. |
| P3 | Lawful basis | Record a lawful basis per processing activity before any real personal data is accepted; consent is not assumed for analytics. | Design requirement | Privacy notice + processing-record review by Compliance reviewer. | No processing record exists. |
| P4 | Age/KYC data | Store only the age assertion and jurisdiction decision; KYC vendor responses are redacted to status + reference; raw identity documents never enter app tables or logs. | Implemented in prototype (local assertion only) | `npm run test:smoke`; inspect assertion columns; `npm run secrets:scan`. | Real age-assurance/KYC provider is absent; vendor retention unknown. |
| P5 | Consent | Explicit, granular opt-in for optional analytics and marketing; withdrawal is as easy as consent; versioned consent text with timestamp and locale. | Implemented in prototype (API/audit) | `GET/POST /v1/privacy/consents`, `POST /v1/privacy/data-use/evaluate`, `npm run privacy:check`; assert withdrawal stops processing. | No consumer-facing consent UI or production receipt/withdrawal propagation. |
| P6 | DSAR (subject access/erasure) | One intake path; export and deletion jobs scoped by principal; deletion cascades to cache/search/analytics; identity re-verification before disclosure. | Implemented in prototype (simulated intake) | `POST /v1/privacy/export`, `POST /v1/privacy/deletion-request`, append-only `privacy_decision_audit`. | Export is a demo manifest; deletion is human-reviewed only; no cache/search/analytics cascade or owner rota. |
| P7 | Retention and deletion | Retention classes per record (operational/financial/privacy-sensitive); automated deletion jobs; financial records follow jurisdictional rules (design target seven years per `FINANCIAL_CONTROLS.md`). | Declared in prototype (not enforced) | `npm run privacy:check`; evaluator rejects stale supplied collection timestamps. | No deletion jobs, enforcement or legal hold model. |
| P8 | Pseudonymisation | Analytics and model-training exports use stable pseudonyms with a separately held mapping; no raw email/phone in warehouse or feature store. | Design requirement | Inspect export schema; sample export must contain no direct identifiers. | Analytics exports are design-only. |
| P9 | No secrets/PII in logs | Central error handler returns safe messages; rate-limit keys never contain tokens or personal data; audit snapshots are redacted and hashed. | Implemented in prototype (baseline) | `npm run secrets:scan`; CI gitleaks scan; structured-log review against the audit field contract in `API_POLICY.md`. | General audit is stdout baseline; no append-only privacy-sensitive store. |
| P10 | RLS and tenancy | Every tenant-scoped table enforces `tenant_id` row-level security; Admin roles do not bypass RLS; cross-tenant read tests must fail. | Implemented in prototype (schema) | Migration review; cross-tenant read test in shared/API tests, `npm run ci:verify`. | Coverage reporting is count-only; production tenancy model not load-tested. |
| P11 | Privacy review for AI | Every model, prompt set and RAG index gets a privacy review: inputs, inferred attributes, retention, human approval and kill switch before evaluation. | Partially implemented in prototype | `npm run privacy:check`, `npm run agents:check`, shared evaluator tests and `PRIVACY_AI_CONTROLS.md`. | Deterministic adapters only; no model review or production eval evidence. |
| P12 | Privacy review for analytics | dashboards and event pipelines reviewed for re-identification, granular location and sensitive-inference risk before launch. | Design requirement | Event-schema review + sampling check; DPIA reference attached. | No analytics pipeline in prototype. |
| P13 | DPIA triggers | DPIA required before: real age/KYC data, systematic taste/behaviour profiling at scale, ADM-19 observability of user-level data, promotion of AI to live actions, new country activation, or any sensitive-category processing. | Blocked (17 high-risk records) | DPIA record with residual-risk sign-off; `npm run privacy:check`, `npm run gates:check`, [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md). | No DPIA completed; closed-loop profiling disabled and all high-risk features blocked. |

---

## 3. Accessibility requirements (WCAG 2.2 AA target)

| # | Requirement | Actionable control | Status | Verification method | Current gap |
|---|---|---|---|---|---|
| A1 | Keyboard access | Every flow, including age gate, checkout and Admin actions, completes with keyboard only; no pointer-only controls. | Design requirement | Scripted keyboard walkthrough of each flow; record failures by screen. | Not tested. |
| A2 | Focus order and visible focus | DOM order matches visual order; `:focus-visible` ring on all interactive elements; focus moves to the first field in a dialog and returns on close. | Design requirement | Tab-order trace + visual screenshot review. | Not tested. |
| A3 | Labels and errors | All inputs have programmatic labels; errors are text (not colour alone), announced via `aria-live`, and name the corrective action. | Design requirement | Automated axe scan + manual form review. | Not tested. |
| A4 | Contrast | Body text ≥ 4.5:1; large text and UI components ≥ 3:1; gold never used as body text on cream (per `05-ui-ux-wireframes.md`). | Design requirement | Token contrast audit of the design system; automated checks in CI. | Tokens specified in docs; prototype tokens not audited. |
| A5 | Text resize and reflow | Usable at 200% zoom and 320 CSS-pixel width without loss of content or function; no fixed-height text containers. | Design requirement | Browser zoom/reflow pass at 200% and 320px. | Not tested. |
| A6 | Reduced motion | `prefers-reduced-motion` disables non-essential animation and auto-advancing carousels. | Design requirement | OS-level reduced-motion test. | Not implemented. |
| A7 | Captions and transcripts | All product and education video has synchronised captions and a transcript; voice-agent outputs have a typed equivalent. | Design requirement | Media inventory check; transcript presence test. | No media shipped; no inventory. |
| A8 | Alt text | Informative product/lifestyle imagery has descriptive alt text; decorative images have empty alt; AR label-scan has manual-entry equivalent. | Design requirement | Image audit + screen-reader pass; rights metadata checked in catalogue imports. | Demo imagery is illustrative; no alt-text audit. |
| A9 | Forms | Input purpose/autocomplete set; inline validation on blur; no time-limited comprehension tasks without extension; error summary links to fields. | Design requirement | Form-by-form checklist; keyboard + screen-reader submission test. | Not tested. |
| A10 | Age gate | Non-dismissible, keyboard-operable, screen-reader-announced; plain-language reason and jurisdiction shown; no colour-only decision state. | Implemented in prototype (local demo gate) | Keyboard and screen-reader walkthrough; DB assertion check in smoke test. | Not an accessible-audited flow; production provider unknown. |
| A11 | Checkout | Focus order follows cart → age → delivery → payment → review; totals, currency and FX lock expiry announced; irreversible action requires explicit confirmation. | Implemented in prototype (simulated order) | Keyboard checkout walkthrough; screen-reader review of totals and errors. | Simulated payment only; no real PSP accessibility evidence. |
| A12 | Admin console | ADM-01…ADM-19 reachable by keyboard; command palette has a visible focus target; T3/T4 approval dialogs announce reason and distinct approver; bulk dry runs expose results as text. | Implemented in prototype (simulation) | Keyboard pass over all 19 workspaces; screen-reader spot check of approval and kill-switch controls. | No audit; ADM-19 telemetry is simulated. |

---

## 4. Inclusivity requirements

| # | Requirement | Actionable control | Status | Verification method | Current gap |
|---|---|---|---|---|---|
| I1 | Plain language | Consumer-facing copy targets a clear reading level; choices are stated as actions ("Verify your age"), not policy prose; legal terms have plain-language summaries. | Design requirement | Editorial review with a plain-language checklist; user comprehension test. | No review panel. |
| I2 | en/fr/es UI | Core storefront and Admin labels available in the three UI locales with no hard-coded strings; untranslated keys are visible in QA. | Implemented in prototype (UI strings) | Locale switch pass; missing-key report. | Only three UI locales; not certified translations. |
| I3 | Africa registry locales | Registry data and templates support en/fr/ar/pt/sw; Arabic flagged RTL; native-speaker review before any country copy is published. | Implemented in prototype (registry data) | `npm run africa:selftest` (generated assertion count); reviewer sign-off before publication. | Registry is design data; no country activation. |
| I4 | RTL Arabic | Logical CSS properties only; nav, steppers, charts, PDF/export templates mirror; mixed Latin/Arabic labels do not truncate. | Design requirement | RTL visual regression across Market, checkout, Admin and exports. | Not implemented in prototype UI. |
| I5 | Cultural review | In-country reviewer checks idiom, tasting vocabulary, imagery, alcohol references and advertising rules per launch market before copy ships. | Design requirement | Recorded review with named role and locale; legal reviewer for ad rules. | No in-country reviewers assigned. |
| I6 | Non-stereotyped imagery | Image set reviewed for varied age, gender, ethnicity, body type and setting; no lifestyle image implies unsafe or underage consumption. | Design requirement | Asset review checklist + moderation record; rights evidence required in imports. | Bundled images are illustrative demo data. |
| I7 | Currency and locale formatting | ISO code shown with symbol; locale-aware dates/numbers; four-digit vintage years never localised; locked FX quote and expiry shown before confirmation. | Implemented in prototype (8 demo rates) | Locale matrix test; confirm FX expiry text in checkout. | Rates are internal constants; licensed rate provider required. |
| I8 | Low bandwidth | Core browse/cart path works on slow connections; progressive image loading; retry with idempotency; offline reading allowed, offline purchase blocked. | Design requirement | Throttled-network test on browse, search and cart; replay check after reconnect. | Not measured. |
| I9 | Assistive technology | Screen reader, switch control, voice control and magnification paths tested for the ten module surfaces and the Admin console. | Not yet verified | Device/AT matrix pass with recorded results; defects filed with owner. | No AT test matrix or results. |
| I10 | Responsible-drinking framing | Age gate precedes browsing; Sommelier/Assist include safety notes and never encourage excessive consumption; Vault copy states risk and no guaranteed returns. | Implemented in prototype (deterministic copy) | Copy review + smoke test of safety-note presence; legal review before launch. | No jurisdiction-specific ad-rule review; AI copy is unapproved. |
| I11 | Cognitive and motor access | No drag-only interactions; timeouts extendable; error recovery preserves entered data; confirmation before destructive admin actions. | Design requirement | WCAG 2.2 task pass with motor/cognitive scenarios. | Not tested. |

---

## 5. Verification cadence and evidence

| Trigger | Verification | Owner role | Evidence location |
|---|---|---|---|
| Each PR touching UI | axe/contrast/keyboard spot checks; no new hard-coded strings | Release Manager | PR checklist |
| Each release candidate | Full keyboard walkthrough of age gate, checkout and all 19 Admin workspaces | Release Manager | Test report attached to release |
| Any high-risk feature request | DPIA + privacy review; gate record in `config/high-risk-features.json` and `npm run gates:check` | Canon Steward + Compliance/Legal reviewer | Sign-off in `LEGAL_COMPLIANCE_SIGNOFF.md` |
| Each canonical/localization change | RTL and locale matrix pass; native-speaker review | Canon Steward | Localization review record |
| Continuous | `npm run setup`, `npm run ci:verify`, `npm run secrets:scan`, CI gitleaks scan | Release Manager | CI artifacts |

**Audit status: no accessibility audit and no privacy audit has been completed.** There is no WCAG conformance report, no DPIA, no penetration test result and no external reviewer evidence in this repository. Every "Implemented in prototype" row is a local demonstration, not a production control.

---

## 6. Governance references

- [`DISCLAIMER.md`](./DISCLAIMER.md) — maturity, data and compliance boundary.
- [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) — implementation, regulation and readiness matrix.
- [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) — privacy and accessibility reviews are outstanding launch gates.
- [`API_POLICY.md`](./API_POLICY.md) — audit fields, redaction, safe errors, authentication requirements.
- [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md) — retention and dispute evidence handling.
- [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md), [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md), [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md), [`ROADMAP.md`](./ROADMAP.md) — governance counterparts.
- [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md) and [`config/privacy-consent-policy.json`](./config/privacy-consent-policy.json) — AI personalization consent, data minimization, DSAR and DPIA control plane; `npm run privacy:check`.
- [`config/high-risk-features.json`](./config/high-risk-features.json) with `npm run gates:check` — machine-readable activation gate.
