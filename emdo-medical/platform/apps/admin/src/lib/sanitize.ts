import {
  INSIGHT_EVIDENCE_STATUSES,
  INSIGHT_METRIC_IDS,
  INSIGHT_REPORT_CADENCES,
  INSIGHT_REPORT_GROUPS,
  INSIGHT_REPORT_IDS,
  INSIGHT_SOURCE_STATUSES,
  ROLES,
  type InsightMetricId,
  type InsightReportCadence,
  type InsightReportGroup,
  type InsightReportId,
  type Role,
} from '@emdo/shared';
import type {
  SafeInsightMetricDefinition,
  SafeInsightMetricValue,
  SafeInsightReport,
  SafeInsightReportDefinition,
} from './contracts';

const SAFE_DIMENSION_KEYS = ['period', 'agentId', 'capability', 'outcome'] as const;

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`INVALID_${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`);
  }
  return value as Record<string, unknown>;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function text(value: unknown, maxLength: number, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`INVALID_${label}`);
  return value.trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('INVALID_OPTIONAL_TEXT');
  return value.trim().slice(0, maxLength) || undefined;
}

function timestamp(value: unknown): string {
  const parsed = text(value, 40, 'timestamp');
  if (Number.isNaN(Date.parse(parsed))) throw new Error('INVALID_TIMESTAMP');
  return parsed;
}

function version(value: unknown): string {
  const parsed = text(value, 20, 'version');
  if (!/^\d+\.\d+\.\d+$/.test(parsed)) throw new Error('INVALID_METRIC_VERSION');
  return parsed;
}

function nullableCount(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('INVALID_METRIC_VALUE');
  }
  return Math.trunc(value);
}

function countryCode(value: unknown): string {
  const parsed = text(value, 8, 'country').toUpperCase();
  if (parsed !== 'ALL' && !/^[A-Z]{2,8}$/.test(parsed)) throw new Error('INVALID_COUNTRY');
  return parsed;
}

function dimensions(value: unknown): Readonly<Record<string, string>> | undefined {
  if (value === undefined || value === null) return undefined;
  const source = asRecord(value, 'dimensions');
  const safe: Record<string, string> = {};
  for (const key of SAFE_DIMENSION_KEYS) {
    const item = source[key];
    if (item === undefined || item === null) continue;
    if (typeof item !== 'string') throw new Error('INVALID_DIMENSION');
    safe[key] = item.trim().slice(0, 64);
  }
  return Object.keys(safe).length ? safe : undefined;
}

export function sanitizeMetricValue(raw: unknown): SafeInsightMetricValue {
  const source = asRecord(raw, 'metric value');
  if (!isOneOf(source['metricId'], INSIGHT_METRIC_IDS)) throw new Error('INVALID_METRIC_ID');
  if (!isOneOf(source['group'], INSIGHT_REPORT_GROUPS)) throw new Error('INVALID_REPORT_GROUP');
  if (!isOneOf(source['evidenceStatus'], INSIGHT_EVIDENCE_STATUSES)) throw new Error('INVALID_EVIDENCE_STATUS');
  if (!isOneOf(source['sourceStatus'], INSIGHT_SOURCE_STATUSES)) throw new Error('INVALID_SOURCE_STATUS');
  if (typeof source['suppressed'] !== 'boolean') throw new Error('INVALID_SUPPRESSION_FLAG');

  const value = nullableCount(source['value'] ?? null);
  const evidence = source['evidenceStatus'];
  if (source['suppressed'] && value !== null) throw new Error('SUPPRESSED_VALUE_MUST_BE_NULL');
  if ((evidence === 'UNAVAILABLE_NO_SOURCE' || evidence === 'BLOCKED_BY_GOVERNANCE') && value !== null) {
    throw new Error('UNAVAILABLE_VALUE_MUST_BE_NULL');
  }

  return {
    metricId: source['metricId'] as InsightMetricId,
    metricVersion: version(source['metricVersion']),
    name: text(source['name'], 100, 'metric name'),
    group: source['group'] as InsightReportGroup,
    evidenceStatus: evidence,
    sourceStatus: source['sourceStatus'],
    countryCode: countryCode(source['countryCode']),
    generatedAt: timestamp(source['generatedAt']),
    value,
    suppressed: source['suppressed'],
    ...(dimensions(source['dimensions']) ? { dimensions: dimensions(source['dimensions']) } : {}),
    ...(optionalText(source['caveat'], 160) ? { caveat: optionalText(source['caveat'], 160) } : {}),
    ...(optionalText(source['missingSource'], 160)
      ? { missingSource: optionalText(source['missingSource'], 160) }
      : {}),
  };
}

export function sanitizeMetricDefinition(raw: unknown): SafeInsightMetricDefinition {
  const source = asRecord(raw, 'metric definition');
  if (!isOneOf(source['id'], INSIGHT_METRIC_IDS)) throw new Error('INVALID_METRIC_ID');
  if (!isOneOf(source['group'], INSIGHT_REPORT_GROUPS)) throw new Error('INVALID_REPORT_GROUP');
  if (!isOneOf(source['ownerRole'], ROLES)) throw new Error('INVALID_OWNER_ROLE');
  if (!isOneOf(source['evidenceStatus'], INSIGHT_EVIDENCE_STATUSES)) throw new Error('INVALID_EVIDENCE_STATUS');
  if (!isOneOf(source['sourceStatus'], INSIGHT_SOURCE_STATUSES)) throw new Error('INVALID_SOURCE_STATUS');
  return {
    id: source['id'],
    version: version(source['version']),
    name: text(source['name'], 100, 'metric name'),
    group: source['group'],
    ownerRole: source['ownerRole'] as Role,
    formula: text(source['formula'], 200, 'formula'),
    evidenceStatus: source['evidenceStatus'],
    sourceStatus: source['sourceStatus'],
    ...(optionalText(source['caveat'], 160) ? { caveat: optionalText(source['caveat'], 160) } : {}),
    ...(optionalText(source['missingSource'], 160)
      ? { missingSource: optionalText(source['missingSource'], 160) }
      : {}),
  };
}

export function sanitizeReportDefinition(raw: unknown): SafeInsightReportDefinition {
  const source = asRecord(raw, 'report definition');
  if (!isOneOf(source['id'], INSIGHT_REPORT_IDS)) throw new Error('INVALID_REPORT_ID');
  if (!isOneOf(source['group'], INSIGHT_REPORT_GROUPS)) throw new Error('INVALID_REPORT_GROUP');
  const metricIds = source['metricIds'];
  const cadences = source['cadences'];
  if (!Array.isArray(metricIds) || !metricIds.every((id) => isOneOf(id, INSIGHT_METRIC_IDS))) {
    throw new Error('INVALID_METRIC_LIST');
  }
  if (!Array.isArray(cadences) || !cadences.every((item) => isOneOf(item, INSIGHT_REPORT_CADENCES))) {
    throw new Error('INVALID_CADENCE_LIST');
  }
  return {
    id: source['id'] as InsightReportId,
    title: text(source['title'], 100, 'report title'),
    group: source['group'],
    metricIds: metricIds as readonly InsightMetricId[],
    cadences: cadences as readonly InsightReportCadence[],
  };
}

export function sanitizeReport(raw: unknown): SafeInsightReport {
  const source = asRecord(raw, 'report');
  if (!isOneOf(source['reportId'], INSIGHT_REPORT_IDS)) throw new Error('INVALID_REPORT_ID');
  if (!isOneOf(source['cadence'], INSIGHT_REPORT_CADENCES)) throw new Error('INVALID_CADENCE');
  const sections = source['sections'];
  if (!Array.isArray(sections)) throw new Error('INVALID_SECTION_LIST');

  const safeSections = sections.map((rawSection) => {
    const section = asRecord(rawSection, 'report section');
    if (!isOneOf(section['metricId'], INSIGHT_METRIC_IDS)) throw new Error('INVALID_METRIC_ID');
    if (!isOneOf(section['group'], INSIGHT_REPORT_GROUPS)) throw new Error('INVALID_REPORT_GROUP');
    if (!isOneOf(section['evidenceStatus'], INSIGHT_EVIDENCE_STATUSES)) throw new Error('INVALID_EVIDENCE_STATUS');
    if (!isOneOf(section['sourceStatus'], INSIGHT_SOURCE_STATUSES)) throw new Error('INVALID_SOURCE_STATUS');
    const values = section['values'];
    if (!Array.isArray(values)) throw new Error('INVALID_VALUE_LIST');
    return {
      metricId: section['metricId'] as InsightMetricId,
      metricVersion: version(section['metricVersion']),
      name: text(section['name'], 100, 'metric name'),
      group: section['group'] as InsightReportGroup,
      evidenceStatus: section['evidenceStatus'],
      sourceStatus: section['sourceStatus'],
      values: values.map(sanitizeMetricValue),
    };
  });

  return {
    reportId: source['reportId'] as InsightReportId,
    title: text(source['title'], 100, 'report title'),
    cadence: source['cadence'] as InsightReportCadence,
    period: text(source['period'], 20, 'period'),
    countryCode: countryCode(source['countryCode']),
    generatedAt: timestamp(source['generatedAt']),
    sections: safeSections,
    note: text(source['note'], 300, 'report note'),
    finalDecisionAuthority: text(source['finalDecisionAuthority'], 80, 'decision authority'),
  };
}
