import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('invoices')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST', 'ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.billingService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'PATIENT',
    'RECEPTIONIST',
    'ACCOUNTANT',
    'HOSPITAL_ADMIN',
    'SUPER_ADMIN',
  )
  @Get()
  findAll(@Query() query: { patientId?: string; hospitalId?: string }) {
    return this.billingService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'PATIENT',
    'RECEPTIONIST',
    'ACCOUNTANT',
    'HOSPITAL_ADMIN',
    'SUPER_ADMIN',
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.billingService.updateStatus(id, dto.status);
  }
}