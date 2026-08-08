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
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches refresh token JWT expiry

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            role: 'PATIENT',
            firstName: dto.firstName,
            lastName: dto.lastName,
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

  async refresh(dto: RefreshTokenDto) {
    let payload: {
      sub: string;
      email: string;
      role: string;
      hospitalId: string | null;
    };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const redisKey = `rt:${payload.sub}:${dto.deviceId}`;
    const storedToken = await this.redisService.get(redisKey);

    if (!storedToken || storedToken !== dto.refreshToken) {
      // Either this token was already rotated out (reuse of a stale token),
      // or no session exists for this user+device at all. Either way, wipe
      // whatever is currently stored so this device is fully logged out.
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

    // Pull hospitalId fresh from the re-fetched user, not from the old payload —
    // if an admin ever changes a staff member's hospital, refresh should reflect
    // the current value, not whatever was true when the old refresh token was issued.
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

  async logout(dto: RefreshTokenDto) {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      // Token's already invalid/expired — nothing to clean up, but don't
      // error either; the end state (no valid session) is what logout wants anyway.
      return { message: 'Logged out' };
    }

    await this.redisService.del(`rt:${payload.sub}:${dto.deviceId}`);

    return { message: 'Logged out' };
  }
}
