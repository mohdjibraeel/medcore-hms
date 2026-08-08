import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private deparmtmentsService: DepartmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @Post()
  create(@Body() dto: CreateDepartmentDto, @Req() req: any) {
    return this.deparmtmentsService.create(dto, req.user);
  }
}
