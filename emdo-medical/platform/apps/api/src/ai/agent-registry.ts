import {
  AI_AGENT_IDS,
  AI_LABELS,
  type AiAgentId,
  type AiDataDomain,
  type AiLabel,
  type Role,
} from '@emdo/shared';

export type AgentState = 'enabled' | 'disabled';

export interface AgentDefinition {
  id: AiAgentId;
  name: string;
  department: string;
  state: AgentState;
  dataDomain: AiDataDomain;
  allowedRoles: readonly Role[];
  capabilities: readonly string[];
  maxContextRecords: number;
  label: AiLabel;
  requiresHumanReview: boolean;
  dependency: string | null;
  notes: string;
}

/**
 * Static, code-reviewed agent registry. All ten departments are registered so
 * policy can be applied uniformly; only agents whose source data and safety
 * gates exist in this repository are enabled.
 */
export const AI_AGENTS: readonly AgentDefinition[] = [
  {
    id: 'patient_assistant',
    name: 'Patient AI Assistant',
    department: 'Patient',
    state: 'enabled',
    dataDomain: 'phi',
    allowedRoles: ['patient', 'caregiver'],
    capabilities: ['general_information', 'explain_authorised_record', 'escalate_to_human'],
    maxContextRecords: 20,
    label: AI_LABELS.nonClinical,
    requiresHumanReview: false,
    dependency: null,
    notes: 'Own-tenant records only. Never interprets, diagnoses or recommends treatment.',
  },
  {
    id: 'doctor_documentation',
    name: 'Doctor Documentation Assistant',
    department: 'Clinical documentation',
    state: 'enabled',
    dataDomain: 'phi',
    allowedRoles: ['clinician'],
    capabilities: ['draft_documentation_outline', 'escalate_to_human'],
    maxContextRecords: 20,
    label: AI_LABELS.draftReview,
    requiresHumanReview: true,
    dependency: 'active patient consent grant',
    notes: 'Draft outlines only; no findings, diagnosis, prescription or final note.',
  },
  {
    id: 'clinic_operations',
    name: 'Clinic Operations AI',
    department: 'Clinic operations',
    state: 'disabled',
    dataDomain: 'non_phi',
    allowedRoles: ['clinic_admin', 'hospital_admin'],
    capabilities: ['operational_summary'],
    maxContextRecords: 0,
    label: AI_LABELS.operational,
    requiresHumanReview: true,
    dependency: 'M4 EMDO Practice',
    notes: 'Design only until facility and staffing data exist.',
  },
  {
    id: 'pharmacy_operations',
    name: 'Pharmacy Operations AI',
    department: 'Pharmacy',
    state: 'disabled',
    dataDomain: 'regulated',
    allowedRoles: ['pharmacist'],
    capabilities: ['inventory_summary'],
    maxContextRecords: 0,
    label: AI_LABELS.operational,
    requiresHumanReview: true,
    dependency: 'M5 EMDO Pharmacy and pharmacist sign-off',
    notes: 'Design only; no dispensing, substitution or prescription activity.',
  },
  {
    id: 'laboratory_operations',
    name: 'Laboratory Operations AI',
    department: 'Laboratory',
    state: 'disabled',
    dataDomain: 'regulated',
    allowedRoles: ['lab_professional'],
    capabilities: ['result_release_checklist'],
    maxContextRecords: 0,
    label: AI_LABELS.operational,
    requiresHumanReview: true,
    dependency: 'M6 EMDO Labs and controlled result-release workflow',
    notes: 'Design only; AI cannot change, release or interpret results.',
  },
  {
    id: 'customer_support',
    name: 'Customer Support AI',
    department: 'Support',
    state: 'disabled',
    dataDomain: 'non_phi',
    allowedRoles: ['support', 'patient'],
    capabilities: ['non_clinical_faq'],
    maxContextRecords: 0,
    label: AI_LABELS.nonClinical,
    requiresHumanReview: false,
    dependency: 'approved support content set',
    notes: 'Design only; no PHI and no clinical answers.',
  },
  {
    id: 'finance_intelligence',
    name: 'Finance Intelligence AI',
    department: 'Finance',
    state: 'disabled',
    dataDomain: 'commercial',
    allowedRoles: ['platform_admin', 'employer_admin'],
    capabilities: ['aggregate_finance_summary'],
    maxContextRecords: 0,
    label: AI_LABELS.operational,
    requiresHumanReview: true,
    dependency: 'approved ledger and finance policy',
    notes: 'Commercial workload; PHI access is prohibited.',
  },
  {
    id: 'marketing',
    name: 'Marketing AI',
    department: 'Marketing',
    state: 'disabled',
    dataDomain: 'commercial',
    allowedRoles: ['platform_admin'],
    capabilities: ['campaign_draft'],
    maxContextRecords: 0,
    label: AI_LABELS.operational,
    requiresHumanReview: true,
    dependency: 'marketing policy and de-identification review',
    notes: 'Commercial workload; PHI access is prohibited.',
  },
  {
    id: 'compliance_monitoring',
    name: 'Compliance Monitoring AI',
    department: 'Compliance',
    state: 'disabled',
    dataDomain: 'commercial',
    allowedRoles: ['compliance_officer', 'auditor'],
    capabilities: ['policy_gap_review'],
    maxContextRecords: 0,
    label: AI_LABELS.operational,
    requiresHumanReview: true,
    dependency: 'SIEM and policy corpus',
    notes: 'Design only; cannot approve or exempt any action.',
  },
  {
    id: 'ceo_executive',
    name: 'CEO Executive Intelligence AI',
    department: 'Executive',
    state: 'disabled',
    dataDomain: 'commercial',
    allowedRoles: ['platform_admin'],
    capabilities: ['executive_digest'],
    maxContextRecords: 0,
    label: AI_LABELS.operational,
    requiresHumanReview: true,
    dependency: 'de-identified aggregate pipeline',
    notes: 'Aggregate-only; PHI access is prohibited.',
  },
];

const BY_ID = new Map<AiAgentId, AgentDefinition>(AI_AGENTS.map((agent) => [agent.id, agent]));

export function assertRegisteredAgentIds(): void {
  const registered = AI_AGENTS.map((agent) => agent.id).sort();
  const expected = [...AI_AGENT_IDS].sort();
  if (JSON.stringify(registered) !== JSON.stringify(expected)) {
    throw new Error('AI_AGENT_REGISTRY_INCOMPLETE');
  }
}

assertRegisteredAgentIds();

export function getAgent(id: string): AgentDefinition {
  const agent = BY_ID.get(id as AiAgentId);
  if (!agent) throw new Error('AI_AGENT_NOT_FOUND');
  return agent;
}

export function listAgents(): readonly AgentDefinition[] {
  return AI_AGENTS;
}

export function assertAgentEnabled(agent: AgentDefinition): void {
  if (agent.state !== 'enabled') throw new Error('AI_AGENT_DISABLED');
}

export function assertCapability(agent: AgentDefinition, capability: string): void {
  if (!agent.capabilities.includes(capability)) throw new Error('AI_CAPABILITY_NOT_ALLOWED');
}

export function assertAgentRole(agent: AgentDefinition, roles: readonly Role[]): void {
  if (!agent.allowedRoles.some((role) => roles.includes(role))) throw new Error('AI_ROLE_NOT_ALLOWED');
}
