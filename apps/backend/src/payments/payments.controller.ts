import { Controller, Post, Body, UseGuards, Req, Headers, RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  async createOrder(@Body('invoiceId') invoiceId: string, @Req() req: any) {
    return this.paymentsService.createOrder(invoiceId, req.user);
  }

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new Error('Raw body not available — check rawBody config in main.ts');
    }
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}