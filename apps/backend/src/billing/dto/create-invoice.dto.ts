import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceItemCategory } from 'generated/prisma/client';

export class CreateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(InvoiceItemCategory)
  category!: InvoiceItemCategory;

  @IsNumber()
  @IsPositive()
  amount!: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  appointmentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}