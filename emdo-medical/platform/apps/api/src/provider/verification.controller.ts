import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { RequireRoles } from '../common/auth/decorators';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { VerificationService } from './verification.service';
import {
  AddCredentialDto,
  CreateProviderProfileDto,
  TransitionProviderDto,
} from './dto/provider.dto';

@ApiTags('provider-verification')
@ApiBearerAuth()
@Controller('v1/providers')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician')
  @Post('me')
  @ApiOperation({ summary: 'Submit a clinician profile for manual credential review' })
  create(@Ctx() ctx: RequestContext, @Body() dto: CreateProviderProfileDto) {
    return this.verification.createProfile(ctx, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician')
  @Get('me')
  @ApiOperation({ summary: 'Read the authenticated clinician’s own verification status' })
  own(@Ctx() ctx: RequestContext) {
    return this.verification.getOwn(ctx);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician')
  @Post('me/credentials')
  @ApiOperation({ summary: 'Add a hashed credential reference before verification is final' })
  addCredential(@Ctx() ctx: RequestContext, @Body() dto: AddCredentialDto) {
    return this.verification.addOwnCredential(ctx, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician')
  @Post('me/resubmit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resubmit a rejected profile with updated evidence' })
  resubmit(@Ctx() ctx: RequestContext) {
    return this.verification.resubmitOwn(ctx);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('compliance_officer')
  @Get('review-queue')
  @ApiOperation({ summary: 'List submitted profiles in the authenticated country' })
  queue(@Ctx() ctx: RequestContext) {
    return this.verification.reviewQueue(ctx);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('compliance_officer')
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Human review transition; verified requires a separate approval decision' })
  review(@Ctx() ctx: RequestContext, @Param('id') id: string, @Body() dto: TransitionProviderDto) {
    return this.verification.review(ctx, id, dto);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Read the append-only verification event history' })
  events(@Ctx() ctx: RequestContext, @Param('id') id: string) {
    return this.verification.events(ctx, id);
  }
}
