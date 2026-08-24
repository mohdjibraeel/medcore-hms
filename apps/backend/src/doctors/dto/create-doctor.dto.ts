import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({
    description: 'Email address for the doctor\'s user account (used for login)',
    example: 'dr.sharma@hospital.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password for the doctor\'s user account',
    example: 'securePass123',
    minLength: 6,
  })
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: 'ID of the hospital the doctor belongs to',
    example: 'clx1p8f9q0003u8mj4p6q7r8s',
  })
  @IsString()
  @IsNotEmpty()
  hospitalId!: string;

  @ApiProperty({
    description: 'Doctor\'s medical specialization',
    example: 'Cardiology',
  })
  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @ApiProperty({
    description: 'Doctor\'s unique medical license number',
    example: 'MCI-123456',
  })
  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @ApiProperty({
    description: 'ID of the department the doctor belongs to',
    example: 'clx1p8f9q0002u8mj9k1l5m6n',
  })
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({
    description: 'Doctor\'s first name',
    example: 'Rohan',
  })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiPropertyOptional({
    description: 'Doctor\'s last name',
    example: 'Sharma',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: 500,
    description: 'Defaults to 0 if omitted',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;
}