import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import Razorpay from 'razorpay';
import { PrismaService } from '../prisma/prisma.service';
import { assertSameHospital } from 'src/common/utils/tenancy.util';
import { Role } from 'generated/prisma/enums';

@Injectable()
export class PaymentsService {
  private readonly razorpay: Razorpay;

  constructor(private prisma: PrismaService) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('Razorpay environment variables are not fully set');
    }
    this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

    async createOrder(
    invoiceId: string,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (currentUser.role === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!patient || patient.id !== invoice.patientId) {
        throw new ForbiddenException('You can only pay your own invoice');
      }
    } else {
      assertSameHospital(currentUser.hospitalId, invoice.hospitalId, currentUser.role as Role);
    }

    const amountInPaise = Math.round(invoice.totalAmount * 100);

    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: invoice.id,
      notes: {
        invoiceId: invoice.id,
      },
    });

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { razorpayOrderId: order.id },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not set');
    }

    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event = payload.event;

    if (event !== 'payment.captured') {
      return { status: 'ignored', event };
    }

    const orderId = payload.payload?.payment?.entity?.order_id;
    if (!orderId) {
      throw new NotFoundException('No order_id in webhook payload');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!invoice) {
      throw new NotFoundException('No invoice matches this order_id');
    }

    if (invoice.status === 'PAID') {
      return { status: 'already_processed', invoiceId: invoice.id };
    }

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID' },
    });

    return { status: 'processed', invoiceId: invoice.id };
  }
}