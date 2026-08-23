import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RedisService } from 'src/redis/redis.service';
import { randomInt, randomUUID } from 'crypto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { randomBytes } from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches refresh token JWT expiry
  private readonly RESET_TOKEN_TTL_SECONDS = 60 * 30; // 30 minutes
  private generateOtp(): string {
    return randomInt(100000, 999999).toString();
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            role: 'PATIENT',
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
          },
        });

        const patient = await tx.patient.create({
          data: {
            userId: user.id,
            dateOfBirth: new Date(dto.dateOfBirth),
          },
        });
        const { password, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, patient };
      },
      { maxWait: 10000, timeout: 15000 },
    );
    const otp = this.generateOtp();
    await this.redisService.set(`otp:email:${result.user.id}`, otp, 60 * 10);
    await this.notificationsService.sendEmail(result.user.email, {
      subject: 'Verify your MedCore account',
      body: `Your verification code is ${otp}. It expires in 10 minutes.`,
    });

    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const deviceId = randomUUID();

    await this.redisService.set(
      `rt:${user.id}:${deviceId}`,
      refreshToken,
      this.REFRESH_TOKEN_TTL_SECONDS,
    );

    return { accessToken, refreshToken, deviceId };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async refresh(refreshToken: string, deviceId: string) {
    let payload: {
      sub: string;
      email: string;
      role: string;
      hospitalId: string | null;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const redisKey = `rt:${payload.sub}:${deviceId}`;
    const storedToken = await this.redisService.get(redisKey);

    if (!storedToken || storedToken !== refreshToken) {
      await this.redisService.del(redisKey);
      throw new UnauthorizedException(
        'Refresh token has already been used or is invalid. Please log in again.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const newPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
    };

    const accessToken = await this.jwtService.signAsync(newPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const newRefreshToken = await this.jwtService.signAsync(newPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.redisService.set(
      redisKey,
      newRefreshToken,
      this.REFRESH_TOKEN_TTL_SECONDS,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, deviceId: string) {
    await this.redisService.del(`rt:${userId}:${deviceId}`);
    return { message: 'Logged out' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Deliberately vague error — don't reveal whether the email exists at all.
    // Otherwise this endpoint becomes a free tool for checking who's registered.
    if (!user) {
      throw new UnauthorizedException('Invalid email or code');
    }

    const key = `otp:email:${user.id}`;
    const storedOtp = await this.redisService.get(key);

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.redisService.del(key);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    return { message: 'Email verified successfully' };
  }

  async sendPhoneOtp(userId: string, dto: SendPhoneOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let phone = user.phone;

    if (dto.phone) {
      // updating/setting the phone — check no one else already has it
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone && existingPhone.id !== userId) {
        throw new ConflictException('This phone number is already registered');
      }
      phone = dto.phone;
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone, phoneVerified: false }, // changing the number resets verification
      });
    }

    if (!phone) {
      throw new ConflictException(
        'No phone number on file. Provide one in the request.',
      );
    }

    const otp = this.generateOtp();
    await this.redisService.set(`otp:phone:${userId}`, otp, 60 * 10);

    await this.notificationsService.sendSms(phone, {
      body: `Your MedCore verification code is ${otp}. It expires in 10 minutes.`,
    });

    return { message: 'OTP sent' };
  }

  async verifyPhone(userId: string, dto: VerifyPhoneDto) {
    const key = `otp:phone:${userId}`;
    const storedOtp = await this.redisService.get(key);

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.redisService.del(key);
    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });

    return { message: 'Phone verified successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return the same generic message, whether or not the email exists.
    // If we said "email not found" here, this endpoint becomes a free tool
    // for checking who has an account — a privacy leak on its own.
    const genericResponse = {
      message: 'If that email is registered, a reset link has been sent.',
    };

    if (!user) {
      return genericResponse;
    }

    // randomBytes, not a 6-digit OTP: this token sits in an email inbox,
    // possibly for a while — it needs to be effectively unguessable, not
    // just "hard to guess in 10 minutes" like an OTP typed on a keypad.
    const token = randomBytes(32).toString('hex');

    await this.redisService.set(
      `pwreset:${token}`,
      user.id,
      this.RESET_TOKEN_TTL_SECONDS,
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.notificationsService.sendEmail(user.email, {
      subject: 'Reset your MedCore password',
      body: `Click this link to reset your password: ${resetLink}. This link expires in 30 minutes.`,
    });

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const key = `pwreset:${dto.token}`;
    const userId = await this.redisService.get(key);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.redisService.del(key); // one-time use, same pattern as the email OTP

    // Password just changed — revoke every active session on every device.
    // Otherwise, someone who had a stolen password AND was already logged in
    // stays logged in even after the "fix."
    await this.redisService.delByPattern(`rt:${userId}:*`);

    return { message: 'Password reset successfully. Please log in again.' };
  }
}
