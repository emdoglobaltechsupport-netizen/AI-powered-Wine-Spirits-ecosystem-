import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { RequireRoles } from '../common/auth/decorators';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { VerificationService } from './verification.service';
import { DecideApprovalDto } from './dto/provider.dto';

@ApiTags('provider-approvals')
@ApiBearerAuth()
@Controller('v1/approvals')
export class ApprovalController {
  constructor(private readonly verification: VerificationService) {}

  @UseGuards(PermissionsGuard)
  @RequireRoles('compliance_officer')
  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a named human approval decision; requester cannot approve' })
  decide(@Ctx() ctx: RequestContext, @Param('id') id: string, @Body() dto: DecideApprovalDto) {
    return this.verification.decideApproval(ctx, id, dto);
  }
}
