import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Doctors are created via /doctors (they need extra fields: specialization,
// licenseNumber, departmentId). Hospital Admins can only self-register
// staff roles here — never another HOSPITAL_ADMIN or SUPER_ADMIN, to avoid
// privilege escalation.
export const REGISTERABLE_STAFF_ROLES = [
  'NURSE',
  'RECEPTIONIST',
  'LAB_TECHNICIAN',
  'PHARMACIST',
  'ACCOUNTANT',
] as const;

export type RegisterableStaffRole = (typeof REGISTERABLE_STAFF_ROLES)[number];

export class CreateStaffDto {
  @ApiProperty({ example: 'nurse.jane@medcore.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6, example: 'TempPass123!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ enum: REGISTERABLE_STAFF_ROLES })
  @IsIn(REGISTERABLE_STAFF_ROLES)
  role!: RegisterableStaffRole;
}