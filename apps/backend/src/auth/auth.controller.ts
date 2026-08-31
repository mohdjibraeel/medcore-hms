import {
  Controller,
  Body,
  Post,
  UseGuards,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
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
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
@Throttle({ default: { limit: 100, ttl: 900000 } })
export class AuthController {
  constructor(private authService: AuthService) {}

  private readonly REFRESH_COOKIE_NAME = 'refresh_token';
  private readonly REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days, in ms

  @ApiOperation({ summary: 'Register a new user account' })
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @ApiOperation({ summary: 'Log in and receive access + refresh tokens' })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body);
    res.cookie(this.REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod; allow http on localhost
      // 'none' is required for cross-site cookies (Vercel frontend calling a
      // Render backend on a different domain) — browsers only accept 'none'
      // when 'secure' is also true, which is why these two are tied together.
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: this.REFRESH_COOKIE_MAX_AGE,
      path: '/auth', // cookie only sent to /auth/* routes, not every request
    });

    const { refreshToken, ...safeResult } = result; // strip it from the JSON body
    return safeResult; // { accessToken, deviceId, user } — no refreshToken in the response
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
  async refresh(
    @Req() req: Request,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[this.REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.authService.refresh(refreshToken, body.deviceId); // <-- was: this.authService.refresh(body)

    res.cookie(this.REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: this.REFRESH_COOKIE_MAX_AGE,
      path: '/auth',
    });

    const { refreshToken: _, ...safeResult } = result;
    return safeResult;
  }

  @ApiOperation({ summary: 'Revoke the refresh token and log out' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: any,
    @Body() dto: { deviceId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.sub, dto.deviceId);
    res.clearCookie(this.REFRESH_COOKIE_NAME, { path: '/auth' });
    return { message: 'Logged out successfully' };
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
