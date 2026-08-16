import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalStatusDto } from './dto/update-status.dto';

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

  async findAll() {
    return this.prisma.hospital.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
}
