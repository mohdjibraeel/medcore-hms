import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicineForm } from '../../../generated/prisma/client';

export class CreateMedicineDto {
  @ApiProperty({
    description: 'Name of the medicine',
    example: 'Paracetamol',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Form/dosage type of the medicine',
    enum: MedicineForm,
    example: MedicineForm.TABLET,
  })
  @IsEnum(MedicineForm)
  form!: MedicineForm;

  @ApiProperty({
    description: 'ID of the hospital this medicine belongs to',
    example: 'clx1p8f9q0003u8mj4p6q7r8s',
  })
  @IsString()
  @IsNotEmpty()
  hospitalId!: string;

  @ApiPropertyOptional({
    description: 'Stock level threshold below which a low-stock alert is triggered. Defaults to 10 if omitted.',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}