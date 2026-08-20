import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLabTestDto {
  @ApiProperty({ example: 'Complete Blood Count' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'g/dL' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refRangeLow?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refRangeHigh?: number;

  @ApiProperty({ example: 350, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;
}