import { Controller, Post, Get, Body, UseGuards, Param, Patch, ForbiddenException, Req } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { DepartmentsService } from '../departments/departments.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateHospitalStatusDto } from './dto/update-status.dto';

@Controller('hospitals')
export class HospitalsController {
  constructor(
    private hospitalsService: HospitalsService,
    private departmentsService: DepartmentsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll() {
    return this.hospitalsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('platform-stats')
  getPlatformStats() {
    return this.hospitalsService.getPlatformStats();
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN','HOSPITAL_ADMIN','ACCOUNTANT')
  @Get('stats')
  getStats(@Req() req: any) {
    if (!req.user.hospitalId) {
      throw new ForbiddenException('Your account is not assigned to a hospital');
    }
    return this.hospitalsService.getStats(req.user.hospitalId);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateHospitalStatusDto) {
    return this.hospitalsService.updateStatus(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/departments')
  findDepartments(@Param('id') id: string) {
    return this.departmentsService.findByHospital(id);
  }
}