import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from 'generated/prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Invoice.appointmentId is @unique in the schema — one invoice per appointment
    const existing = await this.prisma.invoice.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException(
        'An invoice already exists for this appointment',
      );
    }

    const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          appointmentId: dto.appointmentId,
          // Derived from the appointment, never trusted from the client —
          // same rule you used for MedicalRecords
          patientId: appointment.patientId,
          hospitalId: appointment.hospitalId,
          totalAmount,
        },
      });

      await tx.invoiceItem.createMany({
        data: dto.items.map((item) => ({
          invoiceId: invoice.id,
          description: item.description,
          category: item.category,
          amount: item.amount,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: true },
      });
    });
  }

  async findAll(query: { patientId?: string; hospitalId?: string }) {
    const where: any = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.hospitalId) where.hospitalId = query.hospitalId;

    return this.prisma.invoice.findMany({
      where,
      include: {
        items: true,
        patient: { include: { user: true } },
        appointment: { include: { department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        patient: { include: { user: true } },
        appointment: { include: { department: true, doctor: { include: { user: true } } } },
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async updateStatus(id: string, status: InvoiceStatus) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);

    return this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
  }
}