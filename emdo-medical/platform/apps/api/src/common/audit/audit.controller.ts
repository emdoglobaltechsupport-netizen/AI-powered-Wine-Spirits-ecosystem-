import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../auth/request-context';
import { RequireRoles } from '../auth/decorators';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@RequireRoles('auditor', 'platform_admin')
@Controller('v1/audit')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  @Get('events')
  @ApiOperation({ summary: 'Read append-only audit events (audit and platform roles only)' })
  list(
    @Ctx() ctx: RequestContext,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const scope = ctx.isPlatform ? tenantId : ctx.tenantId;
    return this.audit.list(
      scope,
      Number(limit ?? 50),
      this.config.getOrThrow<number>('maxAuditPageSize'),
    );
  }
}
