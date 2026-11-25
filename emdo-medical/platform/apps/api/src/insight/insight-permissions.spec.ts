import {
  INSIGHT_REPORT_GROUPS,
  INSIGHT_ROLE_GROUPS,
  INSIGHT_ROLES,
  type Role,
} from '@emdo/shared';
import { RequestContext } from '../common/auth/request-context';
import { InsightPermissionService } from './insight-permissions';

function ctx(roles: Role[], countryCode = 'SANDBOX'): RequestContext {
  return {
    userId: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000002',
    countryCode,
    roles,
    assurance: 2,
    authTime: Math.floor(Date.now() / 1000),
    jti: 'test-jti',
    isPlatform: roles.includes('platform_admin'),
  };
}

describe('InsightPermissionService', () => {
  const permissions = new InsightPermissionService();

  it('gives every requested administrative role an explicit report-group matrix entry', () => {
    for (const role of INSIGHT_ROLES) {
      const groups = INSIGHT_ROLE_GROUPS[role];
      expect(groups.length).toBeGreaterThan(0);
      for (const group of groups) expect(INSIGHT_REPORT_GROUPS).toContain(group);
    }
  });

  it('never grants report access to clinical or patient roles through Insight', () => {
    const excluded: Role[] = ['patient', 'caregiver', 'clinician', 'clinic_admin', 'hospital_admin', 'pharmacist', 'lab_professional', 'employer_admin', 'support', 'auditor'];
    for (const role of excluded) {
      expect(INSIGHT_ROLE_GROUPS[role]).toEqual([]);
      expect(permissions.allowedGroups(ctx([role]))).toEqual([]);
    }
  });

  it('lets super_admin see all groups but does not grant record access', () => {
    expect(permissions.allowedGroups(ctx(['super_admin']))).toEqual(INSIGHT_REPORT_GROUPS);
    expect(INSIGHT_ROLE_GROUPS.super_admin).toEqual(INSIGHT_REPORT_GROUPS);
  });

  it('denies a metric group outside the caller role', () => {
    expect(() => permissions.assertReportGroup(ctx(['marketing_manager']), 'finance'))
      .toThrow('INSIGHT_REPORT_GROUP_FORBIDDEN');
    expect(() => permissions.assertReportGroup(ctx(['finance_manager']), 'finance'))
      .not.toThrow();
  });

  it('scopes country access for non-super administrators', () => {
    expect(permissions.countryScope(ctx(['country_administrator'], 'SANDBOX'))).toBe('SANDBOX');
    expect(() => permissions.assertCountryScope(ctx(['country_administrator'], 'SANDBOX'), 'KEN'))
      .toThrow('COUNTRY_MISMATCH');
    expect(() => permissions.assertCountryScope(ctx(['super_admin'], 'SANDBOX'), 'ALL'))
      .not.toThrow();
    expect(permissions.countryScope(ctx(['super_admin'], 'SANDBOX'), 'ALL')).toBe('ALL');
  });
});
