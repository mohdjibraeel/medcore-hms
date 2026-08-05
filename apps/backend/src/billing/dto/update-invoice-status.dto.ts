import { IsEnum } from 'class-validator';
import { InvoiceStatus } from 'generated/prisma/client';

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus)
  status!: InvoiceStatus;
}