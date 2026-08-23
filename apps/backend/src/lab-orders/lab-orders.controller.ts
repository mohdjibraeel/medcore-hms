import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LabOrdersService } from './lab-orders.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UploadLabResultDto } from './dto/upload-lab-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateLabTestDto } from './dto/create-lab-test.dto';

@ApiTags('Lab Orders')
@ApiBearerAuth()
@Controller('lab-orders')
export class LabOrdersController {
  constructor(private labOrdersService: LabOrdersService) {}

  @ApiOperation({ summary: 'Order one or more lab tests for a medical record' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Post()
  create(@Body() dto: CreateLabOrderDto, @Req() req: any) {
    return this.labOrdersService.create(dto, req.user);
  }

  @ApiOperation({ summary: "Get the lab technician's queue of pending orders at their hospital" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LAB_TECHNICIAN')
  @Get('queue')
  findQueue(@Req() req: any) {
    return this.labOrdersService.findQueue(req.user);
  }

  @ApiOperation({ summary: 'Create a new lab test type with a price (rejects duplicate names at the same hospital)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post('tests')
  createTest(@Body() dto: CreateLabTestDto, @Req() req: any) {
    return this.labOrdersService.createTest(dto, req.user);
  }

  @ApiOperation({ summary: 'List lab tests available at your hospital' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'LAB_TECHNICIAN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Get('tests')
  findTests(@Req() req: any) {
    return this.labOrdersService.findTests(req.user);
  }

  @ApiOperation({ summary: 'Mark a sample as collected for a lab order' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LAB_TECHNICIAN')
  @Patch(':id/collect')
  collectSample(@Param('id') id: string, @Req() req: any) {
    return this.labOrdersService.collectSample(id, req.user);
  }

  @ApiOperation({ summary: 'Upload results for a lab order' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LAB_TECHNICIAN')
  @Patch(':id/result')
  uploadResult(
    @Param('id') id: string,
    @Body() dto: UploadLabResultDto,
    @Req() req: any,
  ) {
    return this.labOrdersService.uploadResult(id, dto, req.user);
  }

  @ApiOperation({ summary: 'Approve an uploaded lab result, finalizing it for the doctor to see' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LAB_TECHNICIAN')
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.labOrdersService.approve(id, req.user);
  }

  @ApiOperation({ summary: 'Check lab order status/results for a given medical record' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'NURSE')
  @Get('by-medical-record/:medicalRecordId')
  findByMedicalRecord(
    @Param('medicalRecordId') medicalRecordId: string,
    @Req() req: any,
  ) {
    return this.labOrdersService.findByMedicalRecord(medicalRecordId, req.user);
  }
}