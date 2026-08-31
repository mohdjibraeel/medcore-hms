import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHospitalAdminDto {
  @ApiProperty({ example: 'admin@citycarehospital.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6, example: 'TempPass123!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Ravi' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  lastName?: string;
}