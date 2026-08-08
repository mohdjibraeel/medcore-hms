import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreateMedicineBatchDto } from './dto/create-medicine-batch.dto';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async createMedicine(
    dto: CreateMedicineDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    // === THIS BLOCK IS THE FIX ===
    // Instead of trusting dto.hospitalId from the request body, we decide
    // the hospital ourselves based on who's actually logged in.
    // Only SUPER_ADMIN is allowed to specify an arbitrary hospitalId,
    // since they're meant to manage across all hospitals by design.
    const isStaffScoped = currentUser.role !== 'SUPER_ADMIN';

    if (isStaffScoped && !currentUser.hospitalId) {
      throw new ForbiddenException(
        'Staff account is not assigned to a hospital',
      );
    }

    // THIS LINE is the actual gap-closer: for anyone except SUPER_ADMIN,
    // we override whatever hospitalId was sent in the request and force
    // it to be the caller's own hospital instead.
    const effectiveHospitalId = isStaffScoped
      ? currentUser.hospitalId!
      : dto.hospitalId;
    // === END FIX BLOCK ===

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: effectiveHospitalId }, // now uses the safe, server-decided value
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.medicine.create({
      data: {
        name: dto.name,
        form: dto.form,
        hospitalId: effectiveHospitalId, // was: dto.hospitalId (the trusted, unsafe version)
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
      throw new BadRequestException('Expiry date cannot be in the past');
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
