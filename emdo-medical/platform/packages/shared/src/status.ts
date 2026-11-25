export const MATURITY_STATES = ['Design', 'Prototype', 'Pilot', 'Production'] as const;
export type MaturityState = (typeof MATURITY_STATES)[number];

export interface ModuleStatus {
  id: string;
  name: string;
  state: MaturityState;
  evidence: string | null;
  nextGate: string;
}

/**
 * Machine-readable status register. A documentation change never promotes a
 * state. Only a signed evidence record may change `state`.
 */
export const MODULE_STATUS: readonly ModuleStatus[] = [
  {
    id: 'M0',
    name: 'Foundation (identity, RBAC, consent, audit, tenancy, crypto)',
    state: 'Prototype',
    evidence: 'apps/api/test — unit and integration suites; see IMPLEMENTATION_STATUS.md',
    nextGate: 'Independent security review before any pilot use',
  },
  {
    id: 'M1',
    name: 'EMDO Record',
    state: 'Prototype',
    evidence: 'apps/api/test — FHIR validation, encryption, consent enforcement, versioning',
    nextGate: 'Clinical governance review of FHIR profiles and retention before pilot',
  },
  {
    id: 'M2',
    name: 'EMDO Care (verification + directory + appointments)',
    state: 'Prototype',
    evidence: 'apps/api/src/provider/verification-rules.spec.ts; apps/api/test/provider-care.e2e-spec.ts — state machine, approval gate, directory and booking',
    nextGate: 'Authoritative verification source contracted and tested before pilot',
  },
  {
    id: 'M3',
    name: 'EMDO Telehealth',
    state: 'Design',
    evidence: null,
    nextGate: 'Clinical safety and jurisdiction review',
  },
  {
    id: 'M4',
    name: 'EMDO Practice',
    state: 'Design',
    evidence: null,
    nextGate: 'Facility licensing and workflow validation',
  },
  {
    id: 'M5',
    name: 'EMDO Pharmacy',
    state: 'Design',
    evidence: null,
    nextGate: 'Licence verification and pharmacist sign-off workflow',
  },
  {
    id: 'M6',
    name: 'EMDO Labs',
    state: 'Design',
    evidence: null,
    nextGate: 'Licence verification and result-release workflow',
  },
  {
    id: 'M7',
    name: 'EMDO Family',
    state: 'Design',
    evidence: null,
    nextGate: 'Legal review of plan wording',
  },
  {
    id: 'M8',
    name: 'EMDO Corporate',
    state: 'Design',
    evidence: null,
    nextGate: 'Legal review and aggregate-only access test',
  },
  {
    id: 'M9',
    name: 'EMDO Assist',
    state: 'Prototype',
    evidence: 'apps/api/src/ai/*.spec.ts; apps/api/test/ai-assist.e2e-spec.ts — offline gateway, policy gates, consent boundary, labels/sources, approval, escalation and API metrics',
    nextGate: 'Approved tested model provider, DPA/residency decision and AI safety evaluation before pilot',
  },
  {
    id: 'M10',
    name: 'EMDO Insight',
    state: 'Prototype',
    evidence: 'apps/api/src/insight/*.spec.ts; apps/api/test/insight.e2e-spec.ts — versioned metric catalogue, 12-role least-privilege matrix, unavailable-source evidence, small-cell suppression, report generation and PHI-safe audit',
    nextGate: 'De-identification review, privacy sign-off and trusted source modules before pilot',
  },
  {
    id: 'M10-CLIENT',
    name: 'Super Admin portal (Next.js client)',
    state: 'Prototype',
    evidence: 'apps/admin/src/**/*.spec.ts(x) — signed HTTP-only session, role-filtered navigation, server-held API calls, aggregate sanitizers, explicit unavailable states and PHI-safe rendering; next build passes',
    nextGate: 'Hosted deployment review, MFA/rate limiting and privacy sign-off before pilot; no export or sensitive-operation execution is implemented',
  },
];
