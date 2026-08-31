import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  Patch,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateHospitalStatusDto } from './dto/update-status.dto';
import { CreateHospitalAdminDto } from './dto/create-hospital-admin.dto';
import { UpdateHospitalAdminDto } from './dto/update-hospital-admin.dto';

@ApiTags('Hospitals')
@ApiBearerAuth()
@Controller('hospitals')
export class HospitalsController {
  constructor(private hospitalsService: HospitalsService) {}

  @ApiOperation({ summary: 'Create a new hospital (starts as PENDING)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(dto);
  }

  @ApiOperation({
    summary: 'List hospitals (non-Super-Admins only see VERIFIED ones)',
  })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.hospitalsService.findAll(req.user);
  }

  @ApiOperation({
    summary: 'Platform-wide stats across every hospital (Super Admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('platform-stats')
  getPlatformStats() {
    return this.hospitalsService.getPlatformStats();
  }

  @ApiOperation({ summary: "Get stats for the caller's own hospital" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT')
  @Get('stats')
  getStats(@Req() req: any) {
    if (!req.user.hospitalId) {
      throw new ForbiddenException(
        'Your account is not assigned to a hospital',
      );
    }
    return this.hospitalsService.getStats(req.user.hospitalId);
  }

  @ApiOperation({ summary: "Approve or reject a hospital's registration" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateHospitalStatusDto) {
    return this.hospitalsService.updateStatus(id, dto);
  }

  @ApiOperation({ summary: 'Assign a Hospital Admin to a verified hospital' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/admin')
  createAdmin(@Param('id') id: string, @Body() dto: CreateHospitalAdminDto) {
    return this.hospitalsService.createAdmin(id, dto);
  }

  @ApiOperation({ summary: "Update a hospital's admin details" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/admin')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateHospitalAdminDto) {
    return this.hospitalsService.updateAdmin(id, dto);
  }
}
