import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePrescriptionItemDto } from './create-prescription-item-dto';

export class CreatePrescriptionDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() medicalRecordId!: string;

  @ApiPropertyOptional({ example: 'Review in 1 week if symptoms persist' })
  @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: () => CreatePrescriptionItemDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items!: CreatePrescriptionItemDto[];
}