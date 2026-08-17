import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiPropertyOptional({ description: 'Only set when staff books on behalf of a patient' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hospitalId!: string;

  @ApiProperty({ example: '2026-08-20T09:30:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;
}