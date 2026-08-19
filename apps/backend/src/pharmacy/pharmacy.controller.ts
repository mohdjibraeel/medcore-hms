import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreateMedicineBatchDto } from './dto/create-medicine-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DispenseMedicineDto } from './dto/dispense-medicine.dto';

@ApiTags('Pharmacy')
@ApiBearerAuth()
@Controller()
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  @ApiOperation({ summary: "Add a new medicine to the hospital's inventory" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post('medicines')
  createMedicine(@Body() dto: CreateMedicineDto, @Req() req: any) {
    return this.pharmacyService.createMedicine(dto, req.user);
  }

  @ApiOperation({ summary: 'Add a stock batch for an existing medicine' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post('medicine-batches')
  createBatch(@Body() dto: CreateMedicineBatchDto, @Req() req: any) {
    return this.pharmacyService.createBatch(dto, req.user);
  }

  @ApiOperation({ summary: 'List medicines, optionally filtered by hospital or search term' })
  @ApiQuery({ name: 'hospitalId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @UseGuards(JwtAuthGuard)
  @Get('medicines')
  findMedicines(@Query('hospitalId') hospitalId?: string, @Query('search') search?: string) {
    return this.pharmacyService.findMedicines(hospitalId, search);
  }

  @ApiOperation({ summary: 'Dispense medicine against a prescribed item' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post('dispense')
  dispenseMedicine(@Body() dto: DispenseMedicineDto, @Req() req: any) {
    return this.pharmacyService.dispenseMedicine(dto, req.user);
  }
}