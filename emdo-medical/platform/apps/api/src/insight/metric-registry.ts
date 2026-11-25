import type {
  InsightEvidenceStatus,
  InsightMetricId,
  InsightReportCadence,
  InsightReportGroup,
  InsightReportId,
  InsightSourceStatus,
  Role,
} from '@emdo/shared';

/**
 * Versioned, code-reviewed metric catalogue. Definitions carry their own
 * evidence status so an absent source can never be rendered as a measured zero.
 */
export interface InsightMetricDefinition {
  readonly id: InsightMetricId;
  readonly version: '1.0.0';
  readonly name: string;
  readonly group: InsightReportGroup;
  readonly ownerRole: Role;
  readonly formula: string;
  readonly evidenceStatus: InsightEvidenceStatus;
  readonly sourceStatus: InsightSourceStatus;
  readonly caveat?: string;
  readonly missingSource?: string;
}

export interface InsightReportDefinition {
  readonly id: InsightReportId;
  readonly title: string;
  readonly group: InsightReportGroup;
  readonly metricIds: readonly InsightMetricId[];
  readonly cadences: readonly InsightReportCadence[];
}

const ALL_CADENCES: readonly InsightReportCadence[] = ['daily', 'weekly', 'monthly'];

export const INSIGHT_METRICS: readonly InsightMetricDefinition[] = [
  {
    id: 'M10-M001',
    version: '1.0.0',
    name: 'Registered patients',
    group: 'operations',
    ownerRole: 'super_admin',
    formula: 'Distinct user IDs holding a patient role grant, grouped by country',
    evidenceStatus: 'AVAILABLE_WITH_CAVEAT',
    sourceStatus: 'AVAILABLE',
    caveat: 'Role-grant count only; SANDBOX/test accounts are not business performance evidence.',
  },
  {
    id: 'M10-M002',
    version: '1.0.0',
    name: 'Verified doctors',
    group: 'clinical_capacity',
    ownerRole: 'medical_director',
    formula: 'Distinct provider profiles with verification_status = verified, grouped by country',
    evidenceStatus: 'AVAILABLE_WITH_CAVEAT',
    sourceStatus: 'AVAILABLE',
    caveat: 'Manual-review verification is non-authoritative and is not regulatory confirmation.',
  },
  {
    id: 'M10-M003',
    version: '1.0.0',
    name: 'Clinics and hospitals',
    group: 'operations',
    ownerRole: 'operations_manager',
    formula: 'Count of active clinic/hospital facilities',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'M4 EMDO Practice facility register is not implemented.',
  },
  {
    id: 'M10-M004',
    version: '1.0.0',
    name: 'Registered pharmacies',
    group: 'operations',
    ownerRole: 'pharmacy_verification_officer',
    formula: 'Count of licensed pharmacy accounts',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'M5 EMDO Pharmacy register is not implemented.',
  },
  {
    id: 'M10-M005',
    version: '1.0.0',
    name: 'Diagnostic partners',
    group: 'clinical_capacity',
    ownerRole: 'medical_director',
    formula: 'Count of diagnostic/laboratory partners',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'M6 EMDO Labs register is not implemented.',
  },
  {
    id: 'M10-M006',
    version: '1.0.0',
    name: 'Subscription revenue',
    group: 'finance',
    ownerRole: 'finance_manager',
    formula: 'Recognised subscription revenue in the reporting period',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'No billing ledger or subscription source module is implemented.',
  },
  {
    id: 'M10-M007',
    version: '1.0.0',
    name: 'Transaction revenue',
    group: 'finance',
    ownerRole: 'finance_manager',
    formula: 'Recognised transaction revenue in the reporting period',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'No payment ledger or tested payment integration is implemented.',
  },
  {
    id: 'M10-M008',
    version: '1.0.0',
    name: 'Platform operating expenses',
    group: 'finance',
    ownerRole: 'finance_manager',
    formula: 'Operating expenses in the reporting period',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'No finance expense ledger is implemented.',
  },
  {
    id: 'M10-M009',
    version: '1.0.0',
    name: 'Patient registration growth',
    group: 'growth',
    ownerRole: 'marketing_manager',
    formula: 'User registrations holding a patient role grant, grouped by calendar month and country',
    evidenceStatus: 'AVAILABLE_WITH_CAVEAT',
    sourceStatus: 'AVAILABLE',
    caveat: 'Registration growth only; not acquisition spend, conversion or active-subscriber growth.',
  },
  {
    id: 'M10-M010',
    version: '1.0.0',
    name: 'Subscription retention',
    group: 'finance',
    ownerRole: 'finance_manager',
    formula: 'Active-subscriber retention by cohort',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'No subscription event stream is implemented.',
  },
  {
    id: 'M10-M011',
    version: '1.0.0',
    name: 'AI agent activity',
    group: 'ai_activity',
    ownerRole: 'technical_administrator',
    formula: 'Count of ai_interactions grouped by country, agent, capability and outcome',
    evidenceStatus: 'AVAILABLE_TESTED',
    sourceStatus: 'AVAILABLE',
    caveat: 'Aggregate API telemetry only; prompts, generated text and PHI are not stored.',
  },
  {
    id: 'M10-M012',
    version: '1.0.0',
    name: 'Security incidents',
    group: 'security_compliance',
    ownerRole: 'technical_administrator',
    formula: 'Confirmed security incident count in the reporting period',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'No SIEM or incident register is implemented; audit events are not incident evidence.',
  },
  {
    id: 'M10-M013',
    version: '1.0.0',
    name: 'Compliance alerts',
    group: 'security_compliance',
    ownerRole: 'compliance_officer',
    formula: 'Open compliance alerts by policy and severity',
    evidenceStatus: 'BLOCKED_BY_GOVERNANCE',
    sourceStatus: 'BLOCKED_BY_GOVERNANCE',
    missingSource: 'No approved alert rules or policy engine are in force.',
  },
  {
    id: 'M10-M014',
    version: '1.0.0',
    name: 'Expansion opportunities',
    group: 'expansion',
    ownerRole: 'super_admin',
    formula: 'Country expansion opportunity score',
    evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    sourceStatus: 'NO_SOURCE',
    missingSource: 'No approved market dataset or scoring methodology exists.',
  },
];

export const INSIGHT_REPORTS: readonly InsightReportDefinition[] = [
  {
    id: 'business_performance',
    title: 'Business performance',
    group: 'executive',
    metricIds: ['M10-M001', 'M10-M002', 'M10-M003', 'M10-M004', 'M10-M005', 'M10-M009', 'M10-M011'],
    cadences: ALL_CADENCES,
  },
  {
    id: 'revenue_profitability',
    title: 'Revenue and profitability',
    group: 'finance',
    metricIds: ['M10-M006', 'M10-M007', 'M10-M008', 'M10-M010'],
    cadences: ALL_CADENCES,
  },
  {
    id: 'customer_acquisition',
    title: 'Customer acquisition',
    group: 'growth',
    metricIds: ['M10-M009', 'M10-M001'],
    cadences: ALL_CADENCES,
  },
  {
    id: 'subscription_retention',
    title: 'Subscription retention',
    group: 'finance',
    metricIds: ['M10-M010'],
    cadences: ALL_CADENCES,
  },
  {
    id: 'operational_bottlenecks',
    title: 'Operational bottlenecks',
    group: 'operations',
    metricIds: ['M10-M002', 'M10-M003', 'M10-M004', 'M10-M005', 'M10-M011', 'M10-M012', 'M10-M013'],
    cadences: ALL_CADENCES,
  },
  {
    id: 'country_performance',
    title: 'Country performance',
    group: 'operations',
    metricIds: [
      'M10-M001', 'M10-M002', 'M10-M003', 'M10-M004', 'M10-M005', 'M10-M006', 'M10-M007',
      'M10-M008', 'M10-M009', 'M10-M010', 'M10-M011', 'M10-M012', 'M10-M013', 'M10-M014',
    ],
    cadences: ALL_CADENCES,
  },
  {
    id: 'risks',
    title: 'Risks',
    group: 'security_compliance',
    metricIds: ['M10-M012', 'M10-M013'],
    cadences: ALL_CADENCES,
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    group: 'expansion',
    metricIds: ['M10-M014'],
    cadences: ALL_CADENCES,
  },
  {
    id: 'management_recommendations',
    title: 'Management recommendations',
    group: 'executive',
    metricIds: [
      'M10-M001', 'M10-M002', 'M10-M006', 'M10-M007', 'M10-M008', 'M10-M009', 'M10-M011',
      'M10-M012', 'M10-M013', 'M10-M014',
    ],
    cadences: ALL_CADENCES,
  },
];

export function getMetricDefinition(id: string): InsightMetricDefinition | undefined {
  return INSIGHT_METRICS.find((metric) => metric.id === id);
}

export function assertMetricId(id: string): InsightMetricDefinition {
  const metric = getMetricDefinition(id);
  if (!metric) throw new Error('INSIGHT_METRIC_NOT_FOUND');
  return metric;
}

export function getReportDefinition(id: string): InsightReportDefinition | undefined {
  return INSIGHT_REPORTS.find((report) => report.id === id);
}

export function assertReportId(id: string): InsightReportDefinition {
  const report = getReportDefinition(id);
  if (!report) throw new Error('INSIGHT_REPORT_NOT_FOUND');
  return report;
}
