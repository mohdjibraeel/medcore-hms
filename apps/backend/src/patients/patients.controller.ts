import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'RECEPTIONIST',
    'DOCTOR',
    'NURSE',
    'HOSPITAL_ADMIN',
    'ACCOUNTANT',
    'SUPER_ADMIN',
  )
  @Get()
  search(@Query('search') search: string | undefined, @Req() req: any) {
    return this.patientsService.search(search, req.user.hospitalId);
  }
}