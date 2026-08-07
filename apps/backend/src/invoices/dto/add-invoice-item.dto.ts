import { IsString, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';
import { InvoiceItemCategory } from '../../../generated/prisma/client';

export class AddInvoiceItemDto {
  @IsString() @IsNotEmpty() description!: string;
  @IsEnum(InvoiceItemCategory) category!: InvoiceItemCategory;
  @IsNumber() @Min(0.01) amount!: number;
}
