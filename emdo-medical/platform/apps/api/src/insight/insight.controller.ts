import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { INSIGHT_ROLES } from '@emdo/shared';
import { RequireRoles } from '../common/auth/decorators';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { GenerateInsightReportDto, InsightCountryQueryDto } from './dto/insight.dto';
import { InsightService } from './insight.service';

@ApiTags('emdo-insight')
@ApiBearerAuth()
@Controller('v1/insight')
@UseGuards(PermissionsGuard)
@RequireRoles(...INSIGHT_ROLES, 'platform_admin')
export class InsightController {
  constructor(private readonly insight: InsightService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Versioned metric catalogue visible to the caller role' })
  metrics(@Ctx() ctx: RequestContext, @Query() query: InsightCountryQueryDto) {
    return this.insight.listMetrics(ctx, query.country);
  }

  @Get('metrics/:metricId')
  @ApiOperation({ summary: 'Aggregate metric values with evidence status and small-cell suppression' })
  metric(
    @Ctx() ctx: RequestContext,
    @Param('metricId') metricId: string,
    @Query() query: InsightCountryQueryDto,
  ) {
    return this.insight.getMetric(ctx, metricId, query.country);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Role-filtered executive report catalogue' })
  reports(@Ctx() ctx: RequestContext) {
    return this.insight.listReports(ctx);
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Executive report definition' })
  report(@Ctx() ctx: RequestContext, @Param('reportId') reportId: string) {
    return this.insight.getReportDefinition(ctx, reportId);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a daily, weekly or monthly decision-support report' })
  generate(@Ctx() ctx: RequestContext, @Body() dto: GenerateInsightReportDto) {
    return this.insight.generateReport(ctx, dto);
  }
}
