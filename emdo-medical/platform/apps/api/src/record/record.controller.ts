import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { RecordService } from './record.service';
import { CorrectRecordDto, CreateRecordDto } from './dto/record.dto';

@ApiTags('records')
@ApiBearerAuth()
@Controller('v1/records')
export class RecordController {
  constructor(private readonly records: RecordService) {}

  @Post()
  @ApiOperation({ summary: 'Create an encrypted FHIR-compatible record entry' })
  create(@Ctx() ctx: RequestContext, @Body() dto: CreateRecordDto) {
    return this.records.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List current record entries for self or an actively consented patient' })
  list(
    @Ctx() ctx: RequestContext,
    @Query('patientId') patientId?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.records.list(ctx, patientId, resourceType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one record entry with consent enforcement' })
  read(@Ctx() ctx: RequestContext, @Param('id') id: string) {
    return this.records.read(ctx, id);
  }

  @Post(':id/correct')
  @ApiOperation({ summary: 'Append a corrected version; the original remains in history' })
  correct(@Ctx() ctx: RequestContext, @Param('id') id: string, @Body() dto: CorrectRecordDto) {
    return this.records.correct(ctx, id, dto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Read the full version history of a record' })
  versions(@Ctx() ctx: RequestContext, @Param('id') id: string) {
    return this.records.versions(ctx, id);
  }
}
