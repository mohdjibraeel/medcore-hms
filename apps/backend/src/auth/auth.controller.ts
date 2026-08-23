import { Controller, Body, Post, UseGuards, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user account' })
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @ApiOperation({ summary: 'Log in and receive access + refresh tokens' })
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() request: any) {
    return this.authService.getMe(request.user.sub);
  }

  @ApiOperation({ summary: 'Super Admin only — test endpoint for role guard' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admin-only')
  adminOnly(@Req() request: any) {
    return { message: 'Welcome, admin', user: request.user };
  }

  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @ApiOperation({ summary: 'Revoke the refresh token and log out' })
  @Post('logout')
  logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body);
  }

  @ApiOperation({ summary: 'Verify email address using 6-digit OTP' })
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body);
  }

  @ApiOperation({ summary: 'Send or resend an SMS OTP to verify phone number' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-phone-otp')
  sendPhoneOtp(@Req() request: any, @Body() body: SendPhoneOtpDto) {
    return this.authService.sendPhoneOtp(request.user.sub, body);
  }

  @ApiOperation({ summary: 'Verify phone number using 6-digit SMS OTP' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-phone')
  verifyPhone(@Req() request: any, @Body() body: VerifyPhoneDto) {
    return this.authService.verifyPhone(request.user.sub, body);
  }

  @ApiOperation({ summary: 'Request a password reset link via email' })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @ApiOperation({ summary: 'Reset password using a valid reset token' })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}
