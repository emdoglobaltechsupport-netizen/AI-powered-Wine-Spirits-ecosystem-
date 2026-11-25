import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { RequireRoles } from '../common/auth/decorators';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { AppointmentService } from './appointment.service';
import { BookAppointmentDto, CreateSlotDto } from './dto/provider.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('v1/appointments')
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician')
  @Post('slots')
  @ApiOperation({ summary: 'Publish an availability slot after verification' })
  createSlot(@Ctx() ctx: RequestContext, @Body() dto: CreateSlotDto) {
    return this.appointments.createSlot(ctx, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('patient', 'caregiver')
  @Post()
  @ApiOperation({ summary: 'Book an available slot with a verified provider' })
  book(@Ctx() ctx: RequestContext, @Body() dto: BookAppointmentDto) {
    return this.appointments.book(ctx, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('patient', 'caregiver', 'clinician')
  @Get()
  @ApiOperation({ summary: 'List appointments owned by the authenticated patient or provider' })
  list(@Ctx() ctx: RequestContext) {
    return this.appointments.list(ctx);
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('patient', 'caregiver', 'clinician')
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an owned appointment and release its slot' })
  cancel(@Ctx() ctx: RequestContext, @Param('id') id: string) {
    return this.appointments.cancel(ctx, id);
  }
}
