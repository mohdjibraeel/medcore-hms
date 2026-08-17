import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HOSPITAL_ADMIN')
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @ApiOperation({
    summary: 'Register a new staff member (Nurse, Receptionist, Lab Technician, Pharmacist, or Accountant) at your hospital',
  })
  @Post()
  create(@Body() dto: CreateStaffDto, @Req() req: any) {
    return this.staffService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'List staff members registered at your hospital' })
  @Get()
  findAll(@Query('role') role: string | undefined, @Req() req: any) {
    return this.staffService.findAll(req.user, role);
  }
}