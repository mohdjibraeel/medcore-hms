import { IsString, IsNotEmpty, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Frequency } from '../../../generated/prisma/client';

export class CreatePrescriptionItemDto {
  @ApiProperty({ description: 'Medicine ID from pharmacy inventory' })
  @IsString() @IsNotEmpty() medicineId!: string;

  @ApiProperty({ example: '500' })
  @IsString() @IsNotEmpty() dosage!: string;

  @ApiProperty({ example: 'mg' })
  @IsString() @IsNotEmpty() dosageUnit!: string;

  @ApiProperty({ enum: Frequency, description: 'OD / BD / TDS / QID / SOS' })
  @IsEnum(Frequency) frequency!: Frequency;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt() @Min(1) durationDays!: number;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt() @Min(1) quantity!: number;

  @ApiPropertyOptional({ example: 'Take after food' })
  @IsOptional() @IsString() instructions?: string;
}