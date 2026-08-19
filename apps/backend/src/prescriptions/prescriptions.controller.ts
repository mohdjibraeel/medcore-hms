import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @ApiOperation({ summary: 'Issue a new prescription with one or more medicine items' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Post()
  create(@Body() dto: CreatePrescriptionDto, @Req() req: any) {
    return this.prescriptionsService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'Check whether a prescription already exists for this encounter' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'NURSE')
  @Get('by-medical-record/:medicalRecordId')
  findByMedicalRecord(@Param('medicalRecordId') medicalRecordId: string, @Req() req: any) {
    return this.prescriptionsService.findByMedicalRecord(medicalRecordId, req.user);
  }

  @ApiOperation({ summary: 'Get prescriptions pending pharmacy fulfilment' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Get('pending')
  findPending(@Req() req: any) {
    return this.prescriptionsService.findPending(req.user);
  }
}