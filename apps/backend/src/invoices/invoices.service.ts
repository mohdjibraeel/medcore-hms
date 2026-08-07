import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const existing = await this.prisma.invoice.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException(
        'An invoice already exists for this appointment',
      );
    }

    return this.prisma.invoice.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
      },
    });
  }

  async addItem(invoiceId: string, dto: AddInvoiceItemDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'DRAFT') {
      throw new ConflictException(
        `Cannot add items: invoice is currently ${invoice.status}, expected DRAFT`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.create({
        data: {
          invoiceId,
          description: dto.description,
          category: dto.category,
          amount: dto.amount,
        },
      });

      const items = await tx.invoiceItem.findMany({ where: { invoiceId } });
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      return tx.invoice.update({
        where: { id: invoiceId },
        data: { totalAmount },
        include: { items: true },
      });
    });
  }

  async finalize(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'DRAFT') {
      throw new ConflictException(
        `Cannot finalize: invoice is currently ${invoice.status}, expected DRAFT`,
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'FINALIZED' },
    });
  }

  async markPaid(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'FINALIZED') {
      throw new ConflictException(
        `Cannot mark paid: invoice is currently ${invoice.status}, expected FINALIZED`,
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' },
    });
  }

  async findOne(invoiceId: string, currentUser: { sub: string; role: string }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (currentUser.role === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!patient || patient.id !== invoice.patientId) {
        throw new ForbiddenException(
          'You do not have access to this invoice',
        );
      }
    }

    return invoice;
  }
}