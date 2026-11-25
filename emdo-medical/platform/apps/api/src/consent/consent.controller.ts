import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { ConsentService } from './consent.service';
import { CreateConsentDto } from './dto/consent.dto';

@ApiTags('consent')
@ApiBearerAuth()
@Controller('v1/consents')
export class ConsentController {
  constructor(private readonly consents: ConsentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a purpose-specific, time-bound record sharing grant' })
  create(@Ctx() ctx: RequestContext, @Body() dto: CreateConsentDto) {
    return this.consents.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List grants you created or received' })
  list(@Ctx() ctx: RequestContext) {
    return this.consents.list(ctx);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a grant immediately' })
  async revoke(@Ctx() ctx: RequestContext, @Param('id') id: string): Promise<{ revoked: true }> {
    await this.consents.revoke(ctx, id);
    return { revoked: true };
  }
}
