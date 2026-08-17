import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateStaffDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    if (!currentUser.hospitalId) {
      throw new ForbiddenException('Your admin account is not assigned to a hospital');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        // Forced from the admin's own account — never trusted from the
        // request body, so an admin can never register staff into a
        // different hospital than their own.
        hospitalId: currentUser.hospitalId,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(
    currentUser: { role: string; hospitalId: string | null },
    role?: string,
  ) {
    if (!currentUser.hospitalId) {
      throw new ForbiddenException('Your admin account is not assigned to a hospital');
    }

    return this.prisma.user.findMany({
      where: {
        hospitalId: currentUser.hospitalId,
        role: {
          in: role
            ? [role as any]
            : ['NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'ACCOUNTANT'],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}