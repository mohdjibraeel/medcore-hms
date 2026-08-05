import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  hospitalId!: string;

  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;
}
