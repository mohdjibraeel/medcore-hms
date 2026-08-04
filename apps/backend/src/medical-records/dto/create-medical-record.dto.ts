import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsString()
  @IsNotEmpty()
  appointmentId!: string;

  @IsString()
  @IsNotEmpty()
  chiefComplaint!: string;

  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  pulse?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(100)
  spo2?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  weightKg?: number;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsString()
  allergies?: string;
}