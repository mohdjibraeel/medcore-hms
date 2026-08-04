import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePrescriptionItemDto } from './create-prescription-item.dto';

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  medicalRecordId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items!: CreatePrescriptionItemDto[];
}