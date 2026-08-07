import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLabOrderItemDto } from './create-lab-order-item.dto';

export class CreateLabOrderDto {
  @IsString() @IsNotEmpty() medicalRecordId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLabOrderItemDto)
  items!: CreateLabOrderItemDto[];
}