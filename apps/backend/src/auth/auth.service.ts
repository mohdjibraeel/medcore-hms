import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import { LoginDto } from './dto/login.dto';
import { sha256 } from './token.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

        return { user, patient };
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches)
      throw new UnauthorizedException('Invalid credentials');

    return this.issueTokenPair(user);
  }

  // --- new private helper, add below login() ---
  private async issueTokenPair(user: {
    id: string;
    email: string;
    role: string;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    // THIS is the new part — the DB row we spent the last 10 minutes justifying.
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patient: true,
        doctor: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Remove password before returning
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Add this method after login()

  async refresh(refreshToken: string) {
    // 1. Verify the refresh token
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Check if token exists in DB and is not revoked
    const tokenHash = sha256(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found or revoked');
    }

    // 3. (Optional) Rotate: revoke the old token and issue a new one
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // 4. Issue a new token pair
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const newTokens = await this.issueTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return newTokens; // { accessToken, refreshToken }
  }

  async logout(refreshToken: string): Promise<void> {
  const tokenHash = sha256(refreshToken);
  const storedToken = await this.prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null },
  });
  if (storedToken) {
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
  }
  // If token not found, it's already invalid – just return success
}
}
