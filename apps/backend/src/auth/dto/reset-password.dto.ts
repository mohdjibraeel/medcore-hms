import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the reset link' })
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 6, example: 'NewPassword123!' })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}