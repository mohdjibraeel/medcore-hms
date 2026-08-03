import { Controller,Body,Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  @Post('register')
  register(@Body() body: RegisterDto) {
    return { message: 'Register endpoint hit', received: body };
  }
}
