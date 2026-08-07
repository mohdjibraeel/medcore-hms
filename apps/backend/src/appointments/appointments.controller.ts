import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.create(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.appointmentsService.updateStatus(id, dto);
  }
}