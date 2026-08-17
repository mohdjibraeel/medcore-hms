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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @ApiOperation({ summary: 'Create a new draft invoice for an appointment' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST', 'ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.invoicesService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'Add a line item to a draft invoice' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST', 'ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post(':id/items')
  addItem(
    @Param('id') id: string,
    @Body() dto: AddInvoiceItemDto,
    @Req() req: any,
  ) {
    return this.invoicesService.addItem(id, dto, req.user);
  }

  @ApiOperation({ summary: 'Finalize a draft invoice so it can be shared with the patient' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST', 'ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/finalize')
  finalize(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.finalize(id, req.user);
  }

  @ApiOperation({ summary: 'Manually mark an invoice as paid (e.g. cash payment)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/mark-paid')
  markPaid(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.markPaid(id, req.user);
  }

  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'List invoices (accountant/admin view)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Get()
  findMany(@Req() req: any) {
    return this.invoicesService.findMany(req.user);
  }
}