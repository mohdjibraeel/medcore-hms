import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
// Adjust the import path to match your Prisma client location:
import { Frequency } from '../../generated/prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePrescriptionDto) {
    // 1. Get the calling doctor
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: userId },
    });

    if (!doctor) {
      throw new ForbiddenException('You do not have a doctor profile');
    }

    // 2. Verify medical record exists
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: dto.medicalRecordId },
      select: { id: true, patientId: true },
    });

    if (!medicalRecord) {
      throw new NotFoundException(
        `Medical record with ID ${dto.medicalRecordId} not found`,
      );
    }

    // 3. Verify all medicines exist
    const medicineIds = dto.items.map((item) => item.medicineId);
    const medicines = await this.prisma.medicine.findMany({
      where: { id: { in: medicineIds } },
      select: { id: true },
    });

    if (medicines.length !== medicineIds.length) {
      throw new BadRequestException('One or more medicine IDs are invalid');
    }

    // 4. Transaction
    return this.prisma.$transaction(
      async (tx) => {
        const prescription = await tx.prescription.create({
          data: {
            medicalRecordId: dto.medicalRecordId,
            patientId: medicalRecord.patientId,
            doctorId: doctor.id,
            notes: dto.notes,
          },
        });

        const itemsData = dto.items.map((item) => ({
          prescriptionId: prescription.id,
          medicineId: item.medicineId,
          dosage: item.dosage,
          dosageUnit: item.dosageUnit,
          frequency: item.frequency as Frequency,
          durationDays: item.durationDays,
          quantity: item.quantity,
          instructions: item.instructions,
        }));

        await tx.prescriptionItem.createMany({
          data: itemsData,
        });

        // Return the prescription with its items (but without patient/doctor relations)
        return tx.prescription.findUnique({
          where: { id: prescription.id },
          include: {
            items: { include: { medicine: true } },
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 15000,
      },
    );
  }

  async findAll(patientId?: string) {
  const where: any = {};
  if (patientId) {
    where.patientId = patientId;
  }

  return this.prisma.prescription.findMany({
    where,
    include: {
      items: {
        include: {
          medicine: true,          // medicine name, form, etc.
        },
      },
      medicalRecord: {
        select: {
          id: true,
          chiefComplaint: true,
          diagnosis: true,
          doctor: {                 // doctor is on MedicalRecord, not Prescription
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
}
