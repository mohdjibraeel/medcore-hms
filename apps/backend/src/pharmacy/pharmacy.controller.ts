import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreateMedicineBatchDto } from './dto/create-medicine-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DispenseMedicineDto } from './dto/dispense-medicine.dto';

@Controller()
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post('medicines')
  createMedicine(@Body() dto: CreateMedicineDto, @Req() req: any) {
    return this.pharmacyService.createMedicine(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post('medicine-batches')
  createBatch(@Body() dto: CreateMedicineBatchDto) {
    return this.pharmacyService.createBatch(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('medicines')
  findMedicines(
    @Query('hospitalId') hospitalId?: string,
    @Query('search') search?: string,
  ) {
    return this.pharmacyService.findMedicines(hospitalId, search);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @Post('dispense')
  dispenseMedicine(@Body() dto: DispenseMedicineDto, @Req() req: any) {
    return this.pharmacyService.dispenseMedicine(dto, req.user);
  }
}
