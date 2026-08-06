import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsString() @IsNotEmpty() appointmentId!: string;
  @IsString() @IsNotEmpty() chiefComplaint!: string;
  @IsOptional() @IsString() bloodPressure?: string;
  @IsOptional() @IsInt() pulse?: number;
  @IsOptional() @IsNumber() temperature?: number;
  @IsOptional() @IsInt() spo2?: number;
  @IsOptional() @IsNumber() heightCm?: number;
  @IsOptional() @IsNumber() weightKg?: number;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatmentPlan?: string;
  @IsOptional() @IsString() allergies?: string;
}