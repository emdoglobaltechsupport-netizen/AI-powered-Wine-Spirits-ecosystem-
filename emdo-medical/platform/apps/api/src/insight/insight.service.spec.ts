import type { Role } from '@emdo/shared';
import { AuditService } from '../common/audit/audit.service';
import { RequestContext } from '../common/auth/request-context';
import { DatabaseService } from '../database/database.service';
import { GenerateInsightReportDto } from './dto/insight.dto';
import { InsightPermissionService } from './insight-permissions';
import { InsightService } from './insight.service';

function ctx(roles: Role[], countryCode = 'SANDBOX'): RequestContext {
  return {
    userId: '00000000-0000-4000-8000-000000000011',
    tenantId: '00000000-0000-4000-8000-000000000012',
    countryCode,
    roles,
    assurance: 2,
    authTime: Math.floor(Date.now() / 1000),
    jti: 'test-jti',
    isPlatform: roles.includes('platform_admin'),
  };
}

describe('InsightService', () => {
  const db = { query: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new InsightService(
    db as unknown as DatabaseService,
    new InsightPermissionService(),
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    db.query.mockReset();
    audit.record.mockReset();
  });

  it('returns unavailable evidence without querying a missing source', async () => {
    const values = await service.getMetric(ctx(['super_admin']), 'M10-M006', 'ALL');
    expect(db.query).not.toHaveBeenCalled();
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({
      metricId: 'M10-M006',
      metricVersion: '1.0.0',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      value: null,
      suppressed: false,
    });
    expect(values[0].missingSource).toContain('No billing ledger');
  });

  it('suppresses small de-identified cells and reads through the system boundary', async () => {
    db.query.mockResolvedValue({ rows: [{ country_code: 'SANDBOX', value: 9 }] });
    const values = await service.getMetric(ctx(['super_admin']), 'M10-M001', 'ALL');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM user_roles'),
      ['ALL'],
      { isSystem: true },
    );
    expect(values[0]).toMatchObject({ value: null, suppressed: true });
  });

  it('emits aggregate AI activity dimensions only for unsuppressed cells', async () => {
    db.query.mockResolvedValue({
      rows: [{
        country_code: 'SANDBOX',
        agent_id: 'patient_assistant',
        capability: 'general_information',
        outcome: 'answered',
        value: 12,
      }],
    });
    const values = await service.getMetric(ctx(['super_admin']), 'M10-M011', 'ALL');
    expect(values[0]).toMatchObject({
      evidenceStatus: 'AVAILABLE_TESTED',
      value: 12,
      suppressed: false,
      dimensions: {
        agentId: 'patient_assistant',
        capability: 'general_information',
        outcome: 'answered',
      },
    });
    expect(JSON.stringify(values)).not.toContain('my chest hurts');
  });

  it('denies group, country and unknown metric access', async () => {
    await expect(service.getMetric(ctx(['finance_manager']), 'M10-M011'))
      .rejects.toThrow('INSIGHT_REPORT_GROUP_FORBIDDEN');
    await expect(service.getMetric(ctx(['country_administrator'], 'SANDBOX'), 'M10-M001', 'KEN'))
      .rejects.toThrow('COUNTRY_MISMATCH');
    await expect(service.getMetric(ctx(['super_admin']), 'M10-M999'))
      .rejects.toThrow('INSIGHT_METRIC_NOT_FOUND');
  });

  it('generates an audited report with required evidence fields on every metric', async () => {
    db.query.mockResolvedValue({ rows: [{ country_code: 'SANDBOX', value: 12 }] });
    const dto = {
      reportId: 'business_performance',
      cadence: 'daily',
      period: '2026-11-25',
    } as GenerateInsightReportDto;

    const report = await service.generateReport(ctx(['super_admin']), dto);
    expect(report.sections.map((section) => section.metricId)).toEqual(expect.arrayContaining(['M10-M001', 'M10-M003', 'M10-M011']));
    for (const section of report.sections) {
      for (const value of section.values) {
        expect(value).toHaveProperty('metricId');
        expect(value).toHaveProperty('metricVersion');
        expect(value).toHaveProperty('evidenceStatus');
        expect(value).toHaveProperty('sourceStatus');
        expect(value).toHaveProperty('generatedAt');
        expect(value).toHaveProperty('suppressed');
      }
    }
    expect(report.finalDecisionAuthority).toBe('CEO / Super Admin');
    expect(audit.record).toHaveBeenCalledTimes(1);
    const entry = audit.record.mock.calls[0][0];
    expect(entry).toMatchObject({
      action: 'insight_report_generated',
      objectType: 'insight_report',
      objectId: 'business_performance',
      decision: 'allowed',
    });
    expect(entry.metadata).toMatchObject({
      reportId: 'business_performance',
      cadence: 'daily',
      period: '2026-11-25',
      countryCode: 'ALL',
    });
    expect(JSON.stringify(entry.metadata)).not.toContain('chest');
  });

  it('filters report sections to the caller role and never invents finance values', async () => {
    const dto = {
      reportId: 'revenue_profitability',
      cadence: 'monthly',
      period: '2026-11',
    } as GenerateInsightReportDto;
    const report = await service.generateReport(ctx(['finance_manager']), dto);
    expect(report.sections.map((section) => section.metricId)).toEqual([
      'M10-M006', 'M10-M007', 'M10-M008', 'M10-M010',
    ]);
    expect(db.query).not.toHaveBeenCalled();
    for (const section of report.sections) {
      expect(section.evidenceStatus).toBe('UNAVAILABLE_NO_SOURCE');
      expect(section.values[0].value).toBeNull();
    }
  });
});
