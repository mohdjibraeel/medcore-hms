import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalStatusDto } from './dto/update-status.dto';
import { CreateHospitalAdminDto } from './dto/create-hospital-admin.dto';
import { UpdateHospitalAdminDto } from './dto/update-hospital-admin.dto';

@Injectable()
export class HospitalsService {
  // Same IST assumption used for appointment slots — this system assumes a
  // single-timezone (India) deployment.
  private static readonly IST_OFFSET_MINUTES = 330;
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHospitalDto) {
    const existing = await this.prisma.hospital.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('A hospital with this slug already exists');
    }

    return this.prisma.hospital.create({
      data: {
        name: dto.name,
        slug: dto.slug,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateHospitalStatusDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    return this.prisma.hospital.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async createAdmin(hospitalId: string, dto: CreateHospitalAdminDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    // Only verified hospitals should get a working admin login — a
    // PENDING or REJECTED hospital hasn't been approved to operate yet.
    if (hospital.status !== 'VERIFIED') {
      throw new ForbiddenException(
        'Hospital must be VERIFIED before an admin can be assigned',
      );
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
        role: 'HOSPITAL_ADMIN',
        hospitalId: hospital.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateAdmin(hospitalId: string, dto: UpdateHospitalAdminDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    const admin = await this.prisma.user.findFirst({
      where: { hospitalId, role: 'HOSPITAL_ADMIN' },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) {
      throw new NotFoundException('This hospital has no admin to update yet');
    }

    // If the email is being changed, make sure nobody else already has it.
    if (dto.email && dto.email !== admin.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already registered');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email;
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);

    const updated = await this.prisma.user.update({
      where: { id: admin.id },
      data,
    });

    const { password, ...adminWithoutPassword } = updated;
    return adminWithoutPassword;
  }
  async findAll(currentUser: { role: string }) {
    const isPlatformAdmin = currentUser.role === 'SUPER_ADMIN';
    const hospitals = await this.prisma.hospital.findMany({
      where: isPlatformAdmin ? undefined : { status: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'HOSPITAL_ADMIN' },
          select: { id: true, firstName: true, lastName: true, email: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    // Flatten `users` (an array, since Prisma's `include` always returns one)
    // into a single `admin` field — a hospital only ever has one admin today.
    return hospitals.map(({ users, ...hospital }) => ({
      ...hospital,
      admin: users[0] ?? null,
    }));
  }

  // Converts a calendar date (as seen in IST) into the UTC instant range that
  // covers that whole day, so "today" always means the hospital's local day,
  // not whatever timezone the server happens to be running in.
  private getIstDayBoundsUtc(dateStr: string): { start: Date; end: Date } {
    const [year, month, day] = dateStr.split('-').map(Number);
    const start = new Date(
      Date.UTC(year, month - 1, day, 0, -HospitalsService.IST_OFFSET_MINUTES),
    );
    const end = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        0,
        24 * 60 - HospitalsService.IST_OFFSET_MINUTES - 1,
        59,
        999,
      ),
    );
    return { start, end };
  }

  async getStats(hospitalId: string) {
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
    }).format(new Date());
    const { start: todayStart, end: todayEnd } =
      this.getIstDayBoundsUtc(todayStr);

    const [
      todaysAppointments,
      revenueAgg,
      doctorCount,
      departments,
      medicines,
    ] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { hospitalId, scheduledAt: { gte: todayStart, lte: todayEnd } },
        select: { patientId: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          hospitalId,
          status: 'PAID',
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.doctor.count({ where: { department: { hospitalId } } }),
      this.prisma.department.findMany({
        where: { hospitalId },
        include: { _count: { select: { appointments: true } } },
      }),
      this.prisma.medicine.findMany({
        where: { hospitalId },
        include: { batches: { select: { quantity: true } } },
      }),
    ]);

    const patientsToday = new Set(todaysAppointments.map((a) => a.patientId))
      .size;
    const revenueToday = revenueAgg._sum.totalAmount ?? 0;

    const departmentCounts = departments.map((d) => ({
      departmentName: d.name,
      appointmentCount: d._count.appointments,
    }));

    const lowStockMedicines = medicines
      .map((m) => ({
        name: m.name,
        totalStock: m.batches.reduce((sum, b) => sum + b.quantity, 0),
        reorderLevel: m.reorderLevel,
      }))
      .filter((m) => m.totalStock <= m.reorderLevel);

    // Last 7 days including today, counted per IST calendar day.
    const appointmentVolume: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(d);
      const { start, end } = this.getIstDayBoundsUtc(dateStr);
      const count = await this.prisma.appointment.count({
        where: { hospitalId, scheduledAt: { gte: start, lte: end } },
      });
      appointmentVolume.push({ date: dateStr, count });
    }

    return {
      patientsToday,
      revenueToday,
      doctorCount,
      appointmentVolume,
      departmentCounts,
      lowStockMedicines,
    };
  }

  async getPlatformStats() {
    const [hospitalsByStatus, totalDoctors, totalPatients, revenueAgg] =
      await Promise.all([
        this.prisma.hospital.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.doctor.count(),
        this.prisma.patient.count(),
        this.prisma.invoice.aggregate({
          where: { status: 'PAID' },
          _sum: { totalAmount: true },
        }),
      ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      VERIFIED: 0,
      REJECTED: 0,
    };
    hospitalsByStatus.forEach((row) => {
      statusCounts[row.status] = row._count._all;
    });

    return {
      totalHospitals: hospitalsByStatus.reduce(
        (sum, r) => sum + r._count._all,
        0,
      ),
      hospitalsByStatus: statusCounts,
      totalDoctors,
      totalPatients,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
    };
  }
}
