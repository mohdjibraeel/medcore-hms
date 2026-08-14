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
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: dto.medicalRecordId },
    });
    if (!medicalRecord) {
      throw new NotFoundException('Medical record not found');
    }

    const callingDoctor = await this.prisma.doctor.findUnique({
      where: { userId: currentUser.sub },
    });
    if (!callingDoctor) {
      throw new NotFoundException('Doctor profile not found for this account');
    }

    if (medicalRecord.doctorId !== callingDoctor.id) {
      throw new ForbiddenException(
        'You are not the doctor associated with this medical record',
      );
    }

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

  async findPending(currentUser: {
    sub: string;
    role: string;
    hospitalId: string | null;
  }) {
    const isStaffScoped = currentUser.role !== 'SUPER_ADMIN';
    if (isStaffScoped && !currentUser.hospitalId) {
      throw new ForbiddenException(
        'Staff account is not assigned to a hospital',
      );
    }
    const effectiveHospitalId = isStaffScoped
      ? currentUser.hospitalId!
      : undefined;

    const items = await this.prisma.prescriptionItem.findMany({
      where: {
        medicine: {
          ...(effectiveHospitalId ? { hospitalId: effectiveHospitalId } : {}),
        },
      },
      include: {
        medicine: { select: { name: true, form: true } },
        dispensations: { select: { quantity: true } },
        prescription: true, // scalar patientId/doctorId only — no nested relation exists here
      },
      orderBy: { id: 'desc' },
    });

    const pending = items
      .map((item) => {
        const dispensed = item.dispensations.reduce(
          (sum, d) => sum + d.quantity,
          0,
        );
        return { item, remaining: item.quantity - dispensed };
      })
      .filter(({ remaining }) => remaining > 0);

    if (pending.length === 0) {
      return [];
    }

    // Prescription only stores patientId/doctorId as plain strings, not real
    // Prisma relations — so we look those up separately and join in memory.
    const patientIds = [
      ...new Set(pending.map((p) => p.item.prescription.patientId)),
    ];
    const doctorIds = [
      ...new Set(pending.map((p) => p.item.prescription.doctorId)),
    ];

    const [patients, doctors] = await Promise.all([
      this.prisma.patient.findMany({
        where: { id: { in: patientIds } },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.doctor.findMany({
        where: { id: { in: doctorIds } },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const patientMap = new Map(patients.map((p) => [p.id, p]));
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));

    return pending.map(({ item, remaining }) => {
      const patient = patientMap.get(item.prescription.patientId);
      const doctor = doctorMap.get(item.prescription.doctorId);

      return {
        id: item.id,
        medicineName: item.medicine.name,
        medicineForm: item.medicine.form,
        dosage: item.dosage,
        dosageUnit: item.dosageUnit,
        frequency: item.frequency,
        durationDays: item.durationDays,
        quantity: item.quantity,
        remaining,
        patientName: patient
          ? `${patient.user.firstName} ${patient.user.lastName ?? ''}`.trim()
          : 'Unknown patient',
        doctorName: doctor
          ? `${doctor.user.firstName} ${doctor.user.lastName ?? ''}`.trim()
          : 'Unknown doctor',
      };
    });
  }
}
