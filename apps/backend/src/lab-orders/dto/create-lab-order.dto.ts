import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateLabOrderItemDto } from './create-lab-order-item.dto';

export class CreateLabOrderDto {
  @ApiProperty({
    description: 'ID of the medical record this lab order is associated with',
    example: 'clx1p8f9q0005u8mj3n4o5p6q',
  })
  @IsString()
  @IsNotEmpty()
  medicalRecordId!: string;

  @ApiProperty({
    description: 'List of lab tests to include in this order',
    type: [CreateLabOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLabOrderItemDto)
  items!: CreateLabOrderItemDto[];
}