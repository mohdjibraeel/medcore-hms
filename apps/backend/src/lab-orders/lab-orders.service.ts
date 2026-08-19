import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UploadLabResultDto } from './dto/upload-lab-result.dto';
import { Role } from 'generated/prisma/client';
import { assertSameHospital } from 'src/common/utils/tenancy.util';

@Injectable()
export class LabOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateLabOrderDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    // 1. MedicalRecord must exist
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: dto.medicalRecordId },
    });
    if (!medicalRecord) {
      throw new NotFoundException('Medical record not found');
    }

    // 2. Caller must be the doctor who owns this MedicalRecord
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

    // 3. Every labTestId must exist AND belong to the doctor's own hospital —
    // prevents ordering a lab test that's only offered at another hospital.
    const labTestIds = dto.items.map((item) => item.labTestId);
    const labTests = await this.prisma.labTest.findMany({
      where: {
        id: { in: labTestIds },
        hospitalId: currentUser.hospitalId ?? undefined,
      },
    });
    const foundIds = new Set(labTests.map((t) => t.id));
    const missingIds = labTestIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Lab test(s) not found in your hospital's inventory: ${missingIds.join(', ')}`,
      );
    }

    // Block re-ordering a test that's already been ordered for this same
    // encounter, in any prior round, regardless of that order's status —
    // an already-approved or still-pending test shouldn't be orderable again.
    const alreadyOrdered = await this.prisma.labOrderItem.findMany({
      where: {
        labTestId: { in: labTestIds },
        labOrder: { medicalRecordId: medicalRecord.id },
      },
      include: { labTest: true },
    });
    if (alreadyOrdered.length > 0) {
      throw new ConflictException(
        `These test(s) have already been ordered for this encounter: ${alreadyOrdered
          .map((i) => i.labTest.name)
          .join(', ')}`,
      );
    }

    // 4. Create LabOrder + LabOrderItems atomically (status defaults to ORDERED)
    return this.prisma.$transaction(
      async (tx) => {
        const labOrder = await tx.labOrder.create({
          data: { medicalRecordId: medicalRecord.id },
        });

        await tx.labOrderItem.createMany({
          data: dto.items.map((item) => ({
            labOrderId: labOrder.id,
            labTestId: item.labTestId,
          })),
        });

        return tx.labOrder.findUnique({
          where: { id: labOrder.id },
          include: { items: { include: { labTest: true } } },
        });
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }

  async collectSample(
    id: string,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id },
      include: { medicalRecord: { include: { appointment: true } } },
    });
    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    assertSameHospital(
      currentUser.hospitalId,
      labOrder.medicalRecord.appointment.hospitalId,
      currentUser.role as Role,
    );

    if (labOrder.status !== 'ORDERED') {
      throw new ConflictException(
        `Cannot collect sample: order is currently ${labOrder.status}, expected ORDERED`,
      );
    }
    return this.prisma.labOrder.update({
      where: { id },
      data: { status: 'SAMPLE_COLLECTED' },
    });
  }

  async uploadResult(
    id: string,
    dto: UploadLabResultDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        items: { include: { labTest: true } },
        medicalRecord: { include: { appointment: true } },
      },
    });
    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    assertSameHospital(
      currentUser.hospitalId,
      labOrder.medicalRecord.appointment.hospitalId,
      currentUser.role as Role,
    );

    if (labOrder.status !== 'SAMPLE_COLLECTED') {
      throw new ConflictException(
        `Cannot upload result: order is currently ${labOrder.status}, expected SAMPLE_COLLECTED`,
      );
    }

    const validItemIds = new Set(labOrder.items.map((i) => i.id));
    const missingItemIds = dto.items
      .map((i) => i.labOrderItemId)
      .filter((id) => !validItemIds.has(id));
    if (missingItemIds.length > 0) {
      throw new NotFoundException(
        `Lab order item(s) not found on this order: ${missingItemIds.join(', ')}`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        for (const itemResult of dto.items) {
          const item = labOrder.items.find(
            (i) => i.id === itemResult.labOrderItemId,
          )!;
          const { refRangeLow, refRangeHigh } = item.labTest;
          const isFlagged =
            (refRangeLow !== null && itemResult.resultValue < refRangeLow) ||
            (refRangeHigh !== null && itemResult.resultValue > refRangeHigh);

          await tx.labOrderItem.update({
            where: { id: itemResult.labOrderItemId },
            data: { resultValue: itemResult.resultValue, isFlagged },
          });
        }

        await tx.labOrder.update({
          where: { id },
          data: { status: 'RESULT_UPLOADED' },
        });

        return tx.labOrder.findUnique({
          where: { id },
          include: { items: { include: { labTest: true } } },
        });
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }

  async approve(
    id: string,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id },
      include: { medicalRecord: { include: { appointment: true } } },
    });
    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    assertSameHospital(
      currentUser.hospitalId,
      labOrder.medicalRecord.appointment.hospitalId,
      currentUser.role as Role,
    );

    if (labOrder.status !== 'RESULT_UPLOADED') {
      throw new ConflictException(
        `Cannot approve: order is currently ${labOrder.status}, expected RESULT_UPLOADED`,
      );
    }
    return this.prisma.labOrder.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async findQueue(currentUser: {
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

    const labOrders = await this.prisma.labOrder.findMany({
      where: {
        status: { not: 'APPROVED' },
        medicalRecord: {
          appointment: isStaffScoped
            ? { hospitalId: currentUser.hospitalId! }
            : undefined,
        },
      },
      include: {
        items: { include: { labTest: true } },
        medicalRecord: {
          include: {
            patient: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return labOrders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      patientName:
        `${order.medicalRecord.patient.user.firstName} ${order.medicalRecord.patient.user.lastName ?? ''}`.trim(),
      items: order.items.map((item) => ({
        id: item.id,
        testName: item.labTest.name,
        unit: item.labTest.unit,
        refRangeLow: item.labTest.refRangeLow,
        refRangeHigh: item.labTest.refRangeHigh,
        resultValue: item.resultValue,
        isFlagged: item.isFlagged,
      })),
    }));
  }

  async findTests(currentUser: {
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
    return this.prisma.labTest.findMany({
      where: isStaffScoped
        ? { hospitalId: currentUser.hospitalId! }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findByMedicalRecord(
    medicalRecordId: string,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: medicalRecordId },
      include: { appointment: true },
    });
    if (!medicalRecord) {
      throw new NotFoundException('Medical record not found');
    }

    assertSameHospital(
      currentUser.hospitalId,
      medicalRecord.appointment.hospitalId,
      currentUser.role as Role,
    );

    const labOrders = await this.prisma.labOrder.findMany({
      where: { medicalRecordId },
      include: { items: { include: { labTest: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return labOrders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        labTestId: item.labTestId,
        testName: item.labTest.name,
        unit: item.labTest.unit,
        refRangeLow: item.labTest.refRangeLow,
        refRangeHigh: item.labTest.refRangeHigh,
        resultValue: item.resultValue,
        isFlagged: item.isFlagged,
      })),
    }));
  }
}
