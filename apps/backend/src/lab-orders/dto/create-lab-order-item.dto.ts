import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabOrderItemDto {
  @ApiProperty({
    description: 'ID of the lab test to order',
    example: 'clx1p8f9q0004u8mj2t9v0w1x',
  })
  @IsString()
  @IsNotEmpty()
  labTestId!: string;
}