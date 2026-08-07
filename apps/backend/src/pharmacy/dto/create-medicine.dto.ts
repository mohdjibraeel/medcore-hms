import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { MedicineForm } from '../../../generated/prisma/client';

export class CreateMedicineDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(MedicineForm) form!: MedicineForm;
  @IsString() @IsNotEmpty() hospitalId!: string;
  @IsOptional() @IsInt() @Min(0) reorderLevel?: number;
}