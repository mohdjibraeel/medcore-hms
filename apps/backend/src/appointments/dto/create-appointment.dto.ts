import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateAppointmentDto {
  @IsOptional()
  @IsString()
  patientId?: string; // only used when a STAFF member books on behalf of a patient

  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @IsString()
  @IsNotEmpty()
  hospitalId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;
}