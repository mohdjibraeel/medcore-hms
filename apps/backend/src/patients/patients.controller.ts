import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @ApiOperation({ summary: 'Search patients at your own hospital by name or email' })
  @ApiQuery({ name: 'search', required: false, description: 'Matched against first name, last name, and email' })
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