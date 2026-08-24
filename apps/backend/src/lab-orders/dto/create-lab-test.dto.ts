import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLabTestDto {
  @ApiProperty({
    description: 'Name of the lab test',
    example: 'Complete Blood Count',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Unit of measurement for the test result',
    example: 'g/dL',
  })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiPropertyOptional({
    description: 'Lower bound of the normal reference range for this test',
    example: 12.0,
  })
  @IsOptional()
  @IsNumber()
  refRangeLow?: number;

  @ApiPropertyOptional({
    description: 'Upper bound of the normal reference range for this test',
    example: 16.0,
  })
  @IsOptional()
  @IsNumber()
  refRangeHigh?: number;

  @ApiProperty({
    description: 'Price of the lab test',
    example: 350,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;
}