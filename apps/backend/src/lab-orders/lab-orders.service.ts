import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UploadLabResultDto } from './dto/upload-lab-result.dto';

@Injectable()
export class LabOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateLabOrderDto,
    currentUser: { sub: string; role: string },
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

    // 3. Every labTestId must exist
    const labTestIds = dto.items.map((item) => item.labTestId);
    const labTests = await this.prisma.labTest.findMany({
      where: { id: { in: labTestIds } },
    });
    const foundIds = new Set(labTests.map((t) => t.id));
    const missingIds = labTestIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`Lab test(s) not found: ${missingIds.join(', ')}`);
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

  async collectSample(id: string) {
    const labOrder = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }
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

  async uploadResult(id: string, dto: UploadLabResultDto) {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id },
      include: { items: { include: { labTest: true } } },
    });
    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }
    if (labOrder.status !== 'SAMPLE_COLLECTED') {
      throw new ConflictException(
        `Cannot upload result: order is currently ${labOrder.status}, expected SAMPLE_COLLECTED`,
      );
    }

    // Every labOrderItemId in the request must belong to this LabOrder
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

  async approve(id: string) {
    const labOrder = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }
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
}