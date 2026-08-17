import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Medical Records')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private medicalRecordsService: MedicalRecordsService) {}

  @ApiOperation({ summary: 'Create a medical record for an appointment encounter' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR','NURSE')
  @Post()
  create(@Body() dto: CreateMedicalRecordDto, @Req() req: any) {
    return this.medicalRecordsService.create(dto, req.user);
  }

  @ApiOperation({ summary: "Get a patient's full medical record history" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'NURSE', 'PATIENT','SUPER_ADMIN')
  @Get(':patientId')
  findByPatient(@Param('patientId') patientId: string, @Req() req: any) {
    return this.medicalRecordsService.findByPatient(patientId, req.user);
  }
}