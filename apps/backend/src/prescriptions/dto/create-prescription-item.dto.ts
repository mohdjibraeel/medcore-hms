import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsInt } from 'class-validator';

export class CreatePrescriptionItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @IsString()
  @IsNotEmpty()
  dosage!: string; // e.g., "500" or "500"

  @IsString()
  @IsNotEmpty()
  dosageUnit!: string; // e.g., "mg", "ml", "tablet"

  @IsString()
  @IsNotEmpty()
  frequency!: string; // OD, BD, TDS, QID, SOS

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  instructions?: string; // e.g., "Take after meals"
}