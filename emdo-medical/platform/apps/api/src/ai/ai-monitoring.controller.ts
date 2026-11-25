import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { RequireRoles } from '../common/auth/decorators';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { AiMonitoringService } from './monitoring.service';

@ApiTags('emdo-assist-monitoring')
@ApiBearerAuth()
@Controller('v1/ai')
export class AiMonitoringController {
  constructor(private readonly monitoring: AiMonitoringService) {}

  @Get('metrics')
  @UseGuards(PermissionsGuard)
  @RequireRoles('compliance_officer', 'auditor', 'platform_admin')
  @ApiOperation({ summary: 'Aggregate API telemetry for AI interactions, approvals and escalations' })
  metrics(@Ctx() ctx: RequestContext) {
    return this.monitoring.metrics(ctx);
  }
}
