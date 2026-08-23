import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateDoctorDto } from './dto/create-doctor.dto';

@ApiTags('Doctors')
@ApiBearerAuth()
@Controller('doctors')
export class DoctorsController {
  constructor(private doctorService: DoctorsService) {}

  @ApiOperation({ summary: 'Register a new doctor (Hospital Admin scoped to own hospital, Super Admin may target any hospital)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @Post()
  create(@Body() dto: CreateDoctorDto, @Req() req: any) {
    return this.doctorService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'List doctors (non-Super-Admins are scoped to their own hospital regardless of query params)' })
  @ApiQuery({ name: 'hospitalId', required: false, description: 'Only honored for SUPER_ADMIN' })
  @ApiQuery({ name: 'specialization', required: false })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('hospitalId') hospitalId?: string,
    @Query('specialization') specialization?: string,
    @Req() req?: any,
  ) {
    return this.doctorService.findAll(req.user, hospitalId, specialization);
  }
}