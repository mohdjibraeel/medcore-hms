import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateDoctorDto } from './dto/create-doctor.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private doctorService: DoctorsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @Post()
  create(@Body() dto: CreateDoctorDto, @Req() req: any) {
    return this.doctorService.create(dto, req.user);
  }

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