import { IsString, IsNotEmpty, IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreateMedicineBatchDto {
  @IsString() @IsNotEmpty() medicineId!: string;
  @IsString() @IsNotEmpty() batchNumber!: string;
  @IsDateString() manufactureDate!: string;
  @IsDateString() expiryDate!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsNumber() @Min(0) unitCost!: number;
  @IsNumber() @Min(0) mrp!: number;
}