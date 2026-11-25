import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { DirectoryService } from './directory.service';

function parseTelehealth(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException('INVALID_TELEHEALTH_FILTER');
}

@ApiTags('provider-directory')
@ApiBearerAuth()
@Controller('v1/providers')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  @ApiOperation({ summary: 'Search the verified provider directory in the authenticated country' })
  list(
    @Ctx() ctx: RequestContext,
    @Query('specialty') specialty?: string,
    @Query('city') city?: string,
    @Query('telehealth') telehealthRaw?: string,
  ) {
    return this.directory.list(ctx, specialty, city, parseTelehealth(telehealthRaw));
  }

  @Get(':id/slots')
  @ApiOperation({ summary: 'List available slots for one verified provider' })
  slots(@Ctx() ctx: RequestContext, @Param('id') id: string) {
    return this.directory.slots(ctx, id);
  }
}
