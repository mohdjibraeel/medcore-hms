import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadLabResultItemDto {
  @ApiProperty({
    description: 'ID of the lab order item this result belongs to',
    example: 'clx1p8f9q0006u8mj5r6s7t8u',
  })
  @IsString()
  @IsNotEmpty()
  labOrderItemId!: string;

  @ApiProperty({
    description: 'Measured result value for the lab test',
    example: 13.5,
  })
  @IsNumber()
  resultValue!: number;
}