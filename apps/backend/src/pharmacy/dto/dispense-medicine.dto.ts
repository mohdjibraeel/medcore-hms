import { IsInt, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DispenseMedicineDto {
  @ApiProperty({
    description: 'ID of the prescription item being dispensed',
    example: 'clx1p8f9q0008u8mj7y8z9a0b',
  })
  @IsString()
  prescriptionItemId!: string;

  @ApiProperty({
    description: 'Quantity of units to dispense',
    example: 10,
  })
  @IsInt()
  @IsPositive()
  quantity!: number;
}