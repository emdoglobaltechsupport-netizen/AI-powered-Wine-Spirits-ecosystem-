import { Injectable } from '@nestjs/common';
import {
  INSIGHT_MIN_GROUP_SIZE,
  type InsightEvidenceStatus,
  type InsightMetricId,
  type InsightReportGroup,
  type InsightSourceStatus,
} from '@emdo/shared';
import { AuditService } from '../common/audit/audit.service';
import { RequestContext } from '../common/auth/request-context';
import { DatabaseService } from '../database/database.service';
import { GenerateInsightReportDto } from './dto/insight.dto';
import { InsightPermissionService } from './insight-permissions';
import { getInsightQuerySpec, type InsightDimensionColumn } from './insight-queries';
import {
  assertMetricId,
  assertReportId,
  INSIGHT_METRICS,
  INSIGHT_REPORTS,
  type InsightMetricDefinition,
  type InsightReportDefinition,
} from './metric-registry';

export interface InsightMetricValue {
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

export interface InsightReportSection {
  readonly metricId: InsightMetricId;
  readonly metricVersion: string;
  readonly name: string;
  readonly group: InsightReportGroup;
  readonly evidenceStatus: InsightEvidenceStatus;
  readonly sourceStatus: InsightSourceStatus;
  readonly values: readonly InsightMetricValue[];
}

export interface InsightReport {
  readonly reportId: string;
  readonly title: string;
  readonly cadence: string;
  readonly period: string;
  readonly countryCode: string;
  readonly generatedAt: string;
  readonly sections: readonly InsightReportSection[];
  readonly note: string;
  readonly finalDecisionAuthority: string;
}

/** Read-only aggregate boundary. No raw identifiers, PHI or PHI joins are exposed. */
@Injectable()
export class InsightService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: InsightPermissionService,
    private readonly audit: AuditService,
  ) {}

  listMetrics(ctx: RequestContext, requestedCountry?: string): readonly InsightMetricDefinition[] {
    this.permissions.countryScope(ctx, requestedCountry);
    return INSIGHT_METRICS.filter((metric) => this.permissions.canViewReportGroup(ctx, metric.group));
  }

  getReportDefinition(ctx: RequestContext, id: string): InsightReportDefinition {
    const report = assertReportId(id);
    this.permissions.assertReportGroup(ctx, report.group);
    return report;
  }

  listReports(ctx: RequestContext): readonly InsightReportDefinition[] {
    return INSIGHT_REPORTS.filter((report) => this.permissions.canViewReportGroup(ctx, report.group));
  }

  async getMetric(
    ctx: RequestContext,
    id: string,
    requestedCountry?: string,
  ): Promise<readonly InsightMetricValue[]> {
    const definition = assertMetricId(id);
    this.permissions.assertReportGroup(ctx, definition.group);
    const countryCode = this.permissions.countryScope(ctx, requestedCountry);

    if (!this.hasMeasuredSource(definition)) {
      return [this.unavailableValue(definition, countryCode)];
    }

    const spec = getInsightQuerySpec(definition.id);
    if (!spec) throw new Error('INSIGHT_METRIC_SOURCE_NOT_CONFIGURED');

    const rows = await this.db.query<Record<string, unknown>>(
      spec.sql,
      [countryCode],
      { isSystem: true },
    );
    if (!rows.rows.length) return [this.suppressedValue(definition, countryCode)];

    return rows.rows.map((row) => this.mapValue(definition, countryCode, spec.dimensions, row));
  }

  async generateReport(ctx: RequestContext, dto: GenerateInsightReportDto): Promise<InsightReport> {
    const definition = assertReportId(dto.reportId);
    this.permissions.assertReportGroup(ctx, definition.group);
    if (!definition.cadences.includes(dto.cadence)) throw new Error('INVALID_INSIGHT_CADENCE');
    const countryCode = this.permissions.countryScope(ctx, dto.country);

    const visibleMetricIds = definition.metricIds.filter((id) => {
      const metric = assertMetricId(id);
      return this.permissions.canViewReportGroup(ctx, metric.group);
    });

    const sections: InsightReportSection[] = [];
    for (const metricId of visibleMetricIds) {
      const metric = assertMetricId(metricId);
      const values = await this.getMetric(ctx, metric.id, countryCode);
      sections.push({
        metricId: metric.id,
        metricVersion: metric.version,
        name: metric.name,
        group: metric.group,
        evidenceStatus: metric.evidenceStatus,
        sourceStatus: metric.sourceStatus,
        values,
      });
    }

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0] ?? 'unknown',
      action: 'insight_report_generated',
      objectType: 'insight_report',
      objectId: definition.id,
      purpose: 'executive_reporting',
      decision: 'allowed',
      metadata: {
        reportId: definition.id,
        cadence: dto.cadence,
        period: dto.period,
        countryCode,
        reportGroup: definition.group,
        metricCount: sections.length,
      },
    });

    return {
      reportId: definition.id,
      title: definition.title,
      cadence: dto.cadence,
      period: dto.period,
      countryCode,
      generatedAt: new Date().toISOString(),
      sections,
      note: 'Decision support only. Unavailable sections are evidence-backed gaps; no value is estimated. No clinical outcome or quality ranking is produced.',
      finalDecisionAuthority: 'CEO / Super Admin',
    };
  }

  private hasMeasuredSource(definition: InsightMetricDefinition): boolean {
    return definition.evidenceStatus === 'AVAILABLE_TESTED'
      || definition.evidenceStatus === 'AVAILABLE_WITH_CAVEAT';
  }

  private unavailableValue(
    definition: InsightMetricDefinition,
    countryCode: string,
  ): InsightMetricValue {
    return {
      metricId: definition.id,
      metricVersion: definition.version,
      name: definition.name,
      group: definition.group,
      evidenceStatus: definition.evidenceStatus,
      sourceStatus: definition.sourceStatus,
      countryCode,
      generatedAt: new Date().toISOString(),
      value: null,
      suppressed: false,
      ...(definition.caveat ? { caveat: definition.caveat } : {}),
      ...(definition.missingSource ? { missingSource: definition.missingSource } : {}),
    };
  }

  private suppressedValue(
    definition: InsightMetricDefinition,
    countryCode: string,
  ): InsightMetricValue {
    return {
      metricId: definition.id,
      metricVersion: definition.version,
      name: definition.name,
      group: definition.group,
      evidenceStatus: definition.evidenceStatus,
      sourceStatus: definition.sourceStatus,
      countryCode,
      generatedAt: new Date().toISOString(),
      value: null,
      suppressed: true,
      ...(definition.caveat ? { caveat: definition.caveat } : {}),
    };
  }

  private mapValue(
    definition: InsightMetricDefinition,
    fallbackCountry: string,
    dimensions: readonly InsightDimensionColumn[],
    row: Record<string, unknown>,
  ): InsightMetricValue {
    const raw = Number(row['value']);
    const count = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
    const suppressed = count < INSIGHT_MIN_GROUP_SIZE;
    const mappedDimensions: Record<string, string> = {};
    for (const dimension of dimensions) {
      const value = row[dimension.column];
      if (value === null || value === undefined) continue;
      mappedDimensions[dimension.key] = String(value);
    }
    const rowCountry = row['country_code'];
    return {
      metricId: definition.id,
      metricVersion: definition.version,
      name: definition.name,
      group: definition.group,
      evidenceStatus: definition.evidenceStatus,
      sourceStatus: definition.sourceStatus,
      countryCode: typeof rowCountry === 'string' ? rowCountry : fallbackCountry,
      generatedAt: new Date().toISOString(),
      value: suppressed ? null : count,
      suppressed,
      ...(Object.keys(mappedDimensions).length ? { dimensions: mappedDimensions } : {}),
      ...(definition.caveat ? { caveat: definition.caveat } : {}),
    };
  }
}
