// src/prescriptions/prescriptions.controller.ts
import { Controller, Post, Body, UseGuards, Req, Query, Get } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Request } from 'express';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles('DOCTOR')
  create(@Req() req: Request, @Body() dto: CreatePrescriptionDto) {
    const user = (req as any).user as {
      sub: string;
      email: string;
      role: string;
    };
    return this.prescriptionsService.create(user.sub, dto);
  }

  @Get()
  @Roles('DOCTOR', 'PATIENT')
  findAll(@Query('patientId') patientId?: string) {
    return this.prescriptionsService.findAll(patientId);
  }
}
