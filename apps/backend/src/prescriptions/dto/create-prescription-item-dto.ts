import { IsString, IsNotEmpty, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Frequency } from '../../../generated/prisma/client';

export class CreatePrescriptionItemDto {
  @IsString() @IsNotEmpty() medicineId!: string;
  @IsString() @IsNotEmpty() dosage!: string;
  @IsString() @IsNotEmpty() dosageUnit!: string;
  @IsEnum(Frequency) frequency!: Frequency;
  @IsInt() @Min(1) durationDays!: number;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() instructions?: string;
}