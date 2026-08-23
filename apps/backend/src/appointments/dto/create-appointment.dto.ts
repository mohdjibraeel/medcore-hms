import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiPropertyOptional({
    description: 'Patient ID. Only set when staff books on behalf of a patient; otherwise inferred from the authenticated user.',
    example: 'clx1p8f9q0000u8mjg3f2h1a2',
  })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({
    description: 'ID of the doctor the appointment is booked with',
    example: 'clx1p8f9q0001u8mj7d2e3b4c',
  })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({
    description: 'ID of the department the appointment belongs to',
    example: 'clx1p8f9q0002u8mj9k1l5m6n',
  })
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({
    description: 'ID of the hospital where the appointment is booked',
    example: 'clx1p8f9q0003u8mj4p6q7r8s',
  })
  @IsString()
  @IsNotEmpty()
  hospitalId!: string;

  @ApiProperty({
    description: 'Date and time the appointment is scheduled for, in ISO 8601 format',
    example: '2026-08-20T09:30:00.000Z',
  })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({
    description: 'Marks the appointment as an emergency booking',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;
}