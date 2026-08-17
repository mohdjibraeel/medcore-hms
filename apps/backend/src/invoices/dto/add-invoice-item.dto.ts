import { IsString, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceItemCategory } from '../../../generated/prisma/client';

export class AddInvoiceItemDto {
  @ApiProperty({ example: 'Consultation fee' })
  @IsString() @IsNotEmpty() description!: string;

  @ApiProperty({ enum: InvoiceItemCategory })
  @IsEnum(InvoiceItemCategory) category!: InvoiceItemCategory;

  @ApiProperty({ example: 500, minimum: 0.01 })
  @IsNumber() @Min(0.01) amount!: number;
}