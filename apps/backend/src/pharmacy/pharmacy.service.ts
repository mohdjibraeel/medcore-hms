import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreateMedicineBatchDto } from './dto/create-medicine-batch.dto';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async createMedicine(dto: CreateMedicineDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.medicine.create({
      data: {
        name: dto.name,
        form: dto.form,
        hospitalId: dto.hospitalId,
        reorderLevel: dto.reorderLevel ?? 10,
      },
    });
  }

  async createBatch(dto: CreateMedicineBatchDto) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    const expiryDate = new Date(dto.expiryDate);
    if (expiryDate.getTime() < Date.now()) {
      throw new BadRequestException(
        'Expiry date cannot be in the past',
      );
    }

    return this.prisma.medicineBatch.create({
      data: {
        medicineId: dto.medicineId,
        batchNumber: dto.batchNumber,
        manufactureDate: new Date(dto.manufactureDate),
        expiryDate,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        mrp: dto.mrp,
      },
    });
  }

  async findMedicines(hospitalId?: string, search?: string) {
    return this.prisma.medicine.findMany({
      where: {
        ...(hospitalId ? { hospitalId } : {}),
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      include: { batches: true },
    });
  }
}