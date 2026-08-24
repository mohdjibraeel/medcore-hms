import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHospitalDto {
  @ApiProperty({
    description: 'Name of the hospital',
    example: 'City Care Hospital',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({
    description: 'Unique URL-friendly identifier for the hospital',
    example: 'city-care-hospital',
  })
  @IsString()
  @IsNotEmpty()
  slug!: string;
}