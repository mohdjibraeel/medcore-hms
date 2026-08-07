import { IsString, IsNotEmpty } from 'class-validator';

export class CreateLabOrderItemDto {
  @IsString() @IsNotEmpty() labTestId!: string;
}