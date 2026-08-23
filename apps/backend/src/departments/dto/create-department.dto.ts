import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Name of the department',
    example: 'Cardiology',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'ID of the hospital this department belongs to',
    example: 'clx1p8f9q0003u8mj4p6q7r8s',
  })
  @IsString()
  @IsNotEmpty()
  hospitalId!: string;
}