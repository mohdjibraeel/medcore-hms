import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum HospitalStatusInput {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class UpdateHospitalStatusDto {
  @ApiProperty({
    description: 'New status to set for the hospital',
    enum: HospitalStatusInput,
    example: HospitalStatusInput.VERIFIED,
  })
  @IsEnum(HospitalStatusInput)
  status!: HospitalStatusInput;
}