import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() appointmentId!: string;

  @ApiProperty({ example: 'Persistent cough and mild fever for 3 days' })
  @IsString() @IsNotEmpty() chiefComplaint!: string;

  @ApiPropertyOptional({ example: '120/80' })
  @IsOptional() @IsString() bloodPressure?: string;

  @ApiPropertyOptional({ example: 78, description: 'Beats per minute' })
  @IsOptional() @IsInt() pulse?: number;

  @ApiPropertyOptional({ example: 37.2, description: 'Degrees Celsius' })
  @IsOptional() @IsNumber() temperature?: number;

  @ApiPropertyOptional({ example: 98, description: 'Oxygen saturation %' })
  @IsOptional() @IsInt() spo2?: number;

  @ApiPropertyOptional({ example: 170 })
  @IsOptional() @IsNumber() heightCm?: number;

  @ApiPropertyOptional({ example: 65 })
  @IsOptional() @IsNumber() weightKg?: number;

  @ApiPropertyOptional({ example: 'Acute bronchitis' })
  @IsOptional() @IsString() diagnosis?: string;

  @ApiPropertyOptional({ example: 'Rest, fluids, antibiotics for 5 days' })
  @IsOptional() @IsString() treatmentPlan?: string;

  @ApiPropertyOptional({ example: 'Penicillin' })
  @IsOptional() @IsString() allergies?: string;
}