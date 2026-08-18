import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private deparmtmentsService: DepartmentsService) {}

  @ApiOperation({ summary: 'Create a new department' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @Post()
  create(@Body() dto: CreateDepartmentDto, @Req() req: any) {
    return this.deparmtmentsService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'List departments at a given hospital' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findByHospital(@Query('hospitalId') hospitalId: string, @Req() req: any) {
    // Staff (non-SUPER_ADMIN) are forced to their own hospital — the query
    // param is ignored for them, same protection pattern as create().
    const effectiveHospitalId =
      req.user.role === 'SUPER_ADMIN' ? hospitalId : req.user.hospitalId;
    return this.deparmtmentsService.findByHospital(effectiveHospitalId);
  }
}