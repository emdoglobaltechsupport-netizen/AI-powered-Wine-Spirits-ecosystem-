import type {
  InsightEvidenceStatus,
  InsightMetricId,
  InsightReportCadence,
  InsightReportGroup,
  InsightReportId,
  InsightSourceStatus,
  Role,
} from '@emdo/shared';

export interface PortalSession {
  readonly accessToken: string;
  readonly userId: string;
  readonly countryCode: string;
  readonly roles: readonly Role[];
  readonly expiresAt: number;
}

export interface SafeInsightMetricValue {
  readonly metricId: InsightMetricId;
  readonly metricVersion: string;
  readonly name: string;
  readonly group: InsightReportGroup;
  readonly evidenceStatus: InsightEvidenceStatus;
  readonly sourceStatus: InsightSourceStatus;
  readonly countryCode: string;
  readonly generatedAt: string;
  readonly value: number | null;
  readonly suppressed: boolean;
  readonly dimensions?: Readonly<Record<string, string>>;
  readonly caveat?: string;
  readonly missingSource?: string;
}

export interface SafeInsightMetricDefinition {
  readonly id: InsightMetricId;
  readonly version: string;
  readonly name: string;
  readonly group: InsightReportGroup;
  readonly ownerRole: Role;
  readonly formula: string;
  readonly evidenceStatus: InsightEvidenceStatus;
  readonly sourceStatus: InsightSourceStatus;
  readonly caveat?: string;
  readonly missingSource?: string;
}

export interface SafeInsightReportDefinition {
  readonly id: InsightReportId;
  readonly title: string;
  readonly group: InsightReportGroup;
  readonly metricIds: readonly InsightMetricId[];
  readonly cadences: readonly InsightReportCadence[];
}

export interface SafeInsightReport {
  readonly reportId: InsightReportId;
  readonly title: string;
  readonly cadence: InsightReportCadence;
  readonly period: string;
  readonly countryCode: string;
  readonly generatedAt: string;
  readonly sections: readonly {
    readonly metricId: InsightMetricId;
    readonly metricVersion: string;
    readonly name: string;
    readonly group: InsightReportGroup;
    readonly evidenceStatus: InsightEvidenceStatus;
    readonly sourceStatus: InsightSourceStatus;
    readonly values: readonly SafeInsightMetricValue[];
  }[];
  readonly note: string;
  readonly finalDecisionAuthority: string;
}

export interface GenerateReportInput {
  readonly reportId: InsightReportId;
  readonly cadence: InsightReportCadence;
  readonly period: string;
}
