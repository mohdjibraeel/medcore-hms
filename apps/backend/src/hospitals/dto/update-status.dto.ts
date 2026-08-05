import { IsEnum } from 'class-validator';

export enum HospitalStatusInput {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class UpdateHospitalStatusDto {
  @IsEnum(HospitalStatusInput)
  status!: HospitalStatusInput;
}