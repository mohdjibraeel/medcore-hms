import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreateMedicineBatchDto } from './dto/create-medicine-batch.dto';
import { DispenseMedicineDto } from './dto/dispense-medicine.dto';

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

  async dispenseMedicine(
    dto: DispenseMedicineDto,
    currentUser: { sub: string; role: string },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const item = await tx.prescriptionItem.findUnique({
          where: { id: dto.prescriptionItemId },
          include: { dispensations: true },
        });
        if (!item) {
          throw new NotFoundException('Prescription item not found');
        }

        const alreadyDispensed = item.dispensations.reduce(
          (sum, d) => sum + d.quantity,
          0,
        );
        const remaining = item.quantity - alreadyDispensed;

        if (dto.quantity > remaining) {
          throw new BadRequestException(
            `Only ${remaining} unit(s) remain to be dispensed for this item`,
          );
        }

        // FEFO selection: among batches for this medicine that are not
        // expired and not quarantined, pick the one expiring soonest that
        // still has enough quantity. $queryRaw with FOR UPDATE locks the
        // chosen row so a concurrent dispense request can't read the same
        // stale quantity and oversell it.
        type BatchRow = { id: string; quantity: number };

        const batches = await tx.$queryRaw<BatchRow[]>`
          SELECT "id", "quantity"
          FROM "MedicineBatch"
          WHERE "medicineId" = ${item.medicineId}
            AND "isQuarantined" = false
            AND "expiryDate" > NOW()
            AND "quantity" >= ${dto.quantity}
          ORDER BY "expiryDate" ASC
          LIMIT 1
          FOR UPDATE
        `;

        const batch = batches[0];
        if (!batch) {
          throw new BadRequestException(
            'No valid (non-expired, non-quarantined, sufficient-stock) batch available for this medicine',
          );
        }

        await tx.medicineBatch.update({
          where: { id: batch.id },
          data: { quantity: { decrement: dto.quantity } },
        });

        return tx.dispensation.create({
          data: {
            prescriptionItemId: item.id,
            medicineBatchId: batch.id,
            quantity: dto.quantity,
            dispensedByUserId: currentUser.sub,
          },
        });
      },
      { maxWait: 10000, timeout: 10000 },
    );
  }
}
