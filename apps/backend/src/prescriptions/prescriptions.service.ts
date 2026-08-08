import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreatePrescriptionDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    // 1. MedicalRecord must exist
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: dto.medicalRecordId },
    });
    if (!medicalRecord) {
      throw new NotFoundException('Medical record not found');
    }

    // 2. Caller must have a Doctor profile
    const callingDoctor = await this.prisma.doctor.findUnique({
      where: { userId: currentUser.sub },
    });
    if (!callingDoctor) {
      throw new NotFoundException('Doctor profile not found for this account');
    }

    // 3. Caller must be the doctor who owns this MedicalRecord
    // (this transitively guarantees same-hospital already, since a Doctor's
    // hospitalId is fixed at creation — no separate assertSameHospital needed here)
    if (medicalRecord.doctorId !== callingDoctor.id) {
      throw new ForbiddenException(
        'You are not the doctor associated with this medical record',
      );
    }

    // 4. Every medicineId in items must exist AND belong to the doctor's own hospital —
    // prevents prescribing medicine that only exists in another hospital's inventory.
    const medicineIds = dto.items.map((item) => item.medicineId);
    const medicines = await this.prisma.medicine.findMany({
      where: {
        id: { in: medicineIds },
        hospitalId: currentUser.hospitalId ?? undefined,
      },
    });
    const foundIds = new Set(medicines.map((m) => m.id));
    const missingIds = medicineIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Medicine(s) not found in your hospital's inventory: ${missingIds.join(', ')}`,
      );
    }

    // 5. Create Prescription + all PrescriptionItems atomically
    return this.prisma.$transaction(
      async (tx) => {
        const prescription = await tx.prescription.create({
          data: {
            medicalRecordId: medicalRecord.id,
            doctorId: medicalRecord.doctorId,
            patientId: medicalRecord.patientId,
            notes: dto.notes,
          },
        });

        await tx.prescriptionItem.createMany({
          data: dto.items.map((item) => ({
            prescriptionId: prescription.id,
            medicineId: item.medicineId,
            dosage: item.dosage,
            dosageUnit: item.dosageUnit,
            frequency: item.frequency,
            durationDays: item.durationDays,
            quantity: item.quantity,
            instructions: item.instructions,
          })),
        });

        return tx.prescription.findUnique({
          where: { id: prescription.id },
          include: { items: true },
        });
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
}
