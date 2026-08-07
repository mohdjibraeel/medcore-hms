import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class UploadLabResultItemDto {
  @IsString() @IsNotEmpty() labOrderItemId!: string;
  @IsNumber() resultValue!: number;
}