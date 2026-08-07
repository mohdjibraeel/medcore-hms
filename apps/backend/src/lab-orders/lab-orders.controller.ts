import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LabOrdersService } from './lab-orders.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UploadLabResultDto } from './dto/upload-lab-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('lab-orders')
export class LabOrdersController {
  constructor(private labOrdersService: LabOrdersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Post()
  create(@Body() dto: CreateLabOrderDto, @Req() req: any) {
    return this.labOrdersService.create(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LAB_TECHNICIAN')
  @Patch(':id/collect')
  collectSample(@Param('id') id: string) {
    return this.labOrdersService.collectSample(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LAB_TECHNICIAN')
  @Patch(':id/result')
  uploadResult(@Param('id') id: string, @Body() dto: UploadLabResultDto) {
    return this.labOrdersService.uploadResult(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LAB_TECHNICIAN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.labOrdersService.approve(id);
  }
}