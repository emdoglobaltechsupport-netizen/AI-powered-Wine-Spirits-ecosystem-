import { Injectable } from '@nestjs/common';
import {
  INSIGHT_ROLE_GROUPS,
  type InsightReportGroup,
} from '@emdo/shared';
import { RequestContext } from '../common/auth/request-context';

/** The API imports the canonical shared matrix; it remains the enforcing boundary. */

@Injectable()
export class InsightPermissionService {
  allowedGroups(ctx: RequestContext): readonly InsightReportGroup[] {
    const groups = new Set<InsightReportGroup>();
    for (const role of ctx.roles) {
      for (const group of INSIGHT_ROLE_GROUPS[role] ?? []) groups.add(group);
    }
    return [...groups];
  }

  canViewAllCountries(ctx: RequestContext): boolean {
    return ctx.isPlatform || ctx.roles.includes('super_admin');
  }

  countryScope(ctx: RequestContext, requestedCountry?: string): string {
    const requested = requestedCountry?.trim().toUpperCase();
    if (!requested || requested === 'ALL') {
      if (!this.canViewAllCountries(ctx)) return ctx.countryCode;
      return 'ALL';
    }
    this.assertCountryScope(ctx, requested);
    return requested;
  }

  assertCountryScope(ctx: RequestContext, requestedCountry: string): void {
    const requested = requestedCountry.trim().toUpperCase();
    if (requested === 'ALL') {
      if (!this.canViewAllCountries(ctx)) throw new Error('COUNTRY_MISMATCH');
      return;
    }
    if (!this.canViewAllCountries(ctx) && requested !== ctx.countryCode) {
      throw new Error('COUNTRY_MISMATCH');
    }
  }

  assertReportGroup(ctx: RequestContext, group: InsightReportGroup): void {
    if (!this.allowedGroups(ctx).includes(group)) {
      throw new Error('INSIGHT_REPORT_GROUP_FORBIDDEN');
    }
  }

  canViewReportGroup(ctx: RequestContext, group: InsightReportGroup): boolean {
    return this.allowedGroups(ctx).includes(group);
  }
}
