import { Controller, Post, Body, UseGuards, Req, Query, Get } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Request } from 'express';

@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles('DOCTOR')
  create(@Req() req: Request, @Body() dto: CreateMedicalRecordDto) {
    const user = (req as any).user as {
      sub: string;
      email: string;
      role: string;
    };
    return this.medicalRecordsService.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Get()
  findAll(@Query('patientId') patientId: string) {
    return this.medicalRecordsService.findAll(patientId);
  }
}
