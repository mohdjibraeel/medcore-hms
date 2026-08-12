import { IsInt, IsPositive, IsString } from 'class-validator';

export class DispenseMedicineDto {
  @IsString()
  prescriptionItemId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}