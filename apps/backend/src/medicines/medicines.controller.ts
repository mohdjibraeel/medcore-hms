import { Controller, Get, UseGuards } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  @Roles('DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST')
  findAll() {
    return this.medicinesService.findAll();
  }
}