import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @ApiOperation({ summary: "Get a doctor's available time slots for a given date" })
  @ApiQuery({ name: 'doctorId', example: 'doc_123' })
  @ApiQuery({ name: 'date', example: '2026-08-20' })
  @UseGuards(JwtAuthGuard)
  @Get('availability')
  getAvailability(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailability(doctorId, date);
  }

  @ApiOperation({ summary: "Get the current user's own appointments (patient or doctor)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT', 'DOCTOR')
  @Get('me')
  findMine(@Req() req: any) {
    return this.appointmentsService.findMine(req.user);
  }

  @ApiOperation({ summary: "Get a specific patient's appointment history (staff only)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST', 'ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Get('by-patient/:patientId')
  findByPatient(@Param('patientId') patientId: string, @Req() req: any) {
    return this.appointmentsService.findByPatient(patientId, req.user);
  }

  @ApiOperation({ summary: 'Book a new appointment' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'Update an appointment status (e.g. confirm, complete, cancel)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: any,
  ) {
    return this.appointmentsService.updateStatus(id, dto, req.user);
  }

  @ApiOperation({ summary: "Get today's appointments for the hospital (nurse/admin view)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Get('today')
  findToday(@Req() req: any) {
    return this.appointmentsService.findTodayForHospital(req.user);
  }
}