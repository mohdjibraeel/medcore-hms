import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'patient@medcore.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6, example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '1990-01-15', description: 'ISO date string' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;
}