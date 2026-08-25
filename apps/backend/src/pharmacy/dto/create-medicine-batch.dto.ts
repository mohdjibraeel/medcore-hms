import { IsString, IsNotEmpty, IsDateString, IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMedicineBatchDto {
  @ApiProperty({
    description: 'ID of the medicine this batch belongs to',
    example: 'clx1p8f9q0007u8mj6v7w8x9y',
  })
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({
    description: 'Batch number for tracking this stock lot',
    example: 'B-2026-0456',
  })
  @IsString()
  @IsNotEmpty()
  batchNumber!: string;

  @ApiProperty({
    description: 'Date the batch was manufactured, in ISO 8601 format',
    example: '2026-01-15T00:00:00.000Z',
  })
  @IsDateString()
  manufactureDate!: string;

  @ApiProperty({
    description: 'Expiry date of the batch, in ISO 8601 format',
    example: '2027-06-30T00:00:00.000Z',
  })
  @IsDateString()
  expiryDate!: string;

  @ApiProperty({
    description: 'Quantity of units in this batch',
    example: 500,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Cost per unit paid to acquire this batch',
    example: 8.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @ApiProperty({
    description: 'Maximum retail price per unit',
    example: 12.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  mrp!: number;
}