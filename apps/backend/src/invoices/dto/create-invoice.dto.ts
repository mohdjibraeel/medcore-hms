import { IsString, IsNotEmpty } from 'class-validator';

export class CreateInvoiceDto {
  @IsString() @IsNotEmpty() appointmentId!: string;
}