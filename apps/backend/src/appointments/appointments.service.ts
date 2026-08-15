import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { assertSameHospital } from 'src/common/utils/tenancy.util';
import { Role } from 'generated/prisma/client';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class AppointmentsService {
  // Clinic hours assumption — not stored anywhere in the schema yet, so this
  // is a deliberate fixed default rather than derived data. Revisit if the
  // PRD's "doctor availability calendar" work ever adds real per-doctor hours.
  private static readonly SLOT_START_HOUR = 9; // 9:00 AM
  private static readonly SLOT_END_HOUR = 17; // 5:00 PM (last slot starts 16:30)
  private static readonly SLOT_MINUTES = 30;

  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  // Hardcoded IST (UTC+5:30) — this system assumes a single-timezone (India)
  // hospital deployment. Revisit if multi-region hospitals are ever supported.
  private static readonly IST_OFFSET_MINUTES = 330;

  private istSlotToUtc(dateStr: string, hour: number, minute: number): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const totalMinutes =
      hour * 60 + minute - AppointmentsService.IST_OFFSET_MINUTES;
    // Date.UTC normalizes out-of-range minute values automatically (including
    // negative ones), correctly rolling back into the previous UTC hour/day.
    return new Date(Date.UTC(year, month - 1, day, 0, totalMinutes));
  }

  async getAvailability(doctorId: string, dateStr: string) {
    if (!doctorId || !dateStr) {
      throw new NotFoundException('doctorId and date are both required');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { scheduledAt: true },
    });

    const bookedTimes = new Set(
      bookedAppointments.map((appt) => appt.scheduledAt.toISOString()),
    );

    const slots: { time: string; scheduledAt: string; available: boolean }[] =
      [];

    for (
      let hour = AppointmentsService.SLOT_START_HOUR;
      hour < AppointmentsService.SLOT_END_HOUR;
      hour++
    ) {
      for (
        let minute = 0;
        minute < 60;
        minute += AppointmentsService.SLOT_MINUTES
      ) {
        const slotDate = this.istSlotToUtc(dateStr, hour, minute);
        const iso = slotDate.toISOString();

        slots.push({
          time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          scheduledAt: iso,
          available: !bookedTimes.has(iso),
        });
      }
    }

    return { doctorId, date: dateStr, slots };
  }

  async create(
    dto: CreateAppointmentDto,
    currentUser: { sub: string; role: string },
  ) {
    let patientId: string;

    if (currentUser.role === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!patient) {
        throw new NotFoundException(
          'Patient profile not found for this account',
        );
      }
      patientId = patient.id;
    } else {
      if (!dto.patientId) {
        throw new ForbiddenException(
          'patientId is required when booking on behalf of a patient',
        );
      }
      patientId = dto.patientId;
    }

    const [patient, doctor, department, hospital] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: patientId } }),
      this.prisma.doctor.findUnique({ where: { id: dto.doctorId } }),
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
      this.prisma.hospital.findUnique({ where: { id: dto.hospitalId } }),
    ]);
    if (!patient) throw new NotFoundException('Patient not found');
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!department) throw new NotFoundException('Department not found');
    if (!hospital) throw new NotFoundException('Hospital not found');

    const scheduledAt = new Date(dto.scheduledAt);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Doctor" WHERE id = ${dto.doctorId} FOR UPDATE`;

        const conflict = await tx.appointment.findFirst({
          where: {
            doctorId: dto.doctorId,
            scheduledAt,
            status: {
              notIn: ['CANCELLED', 'NO_SHOW'],
            },
          },
        });

        if (conflict) {
          throw new ConflictException(
            'This doctor already has an appointment at the selected time',
          );
        }

        return tx.appointment.create({
          data: {
            patientId,
            doctorId: dto.doctorId,
            departmentId: dto.departmentId,
            hospitalId: dto.hospitalId,
            scheduledAt,
            isEmergency: dto.isEmergency ?? false,
          },
        });
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
  async findMine(currentUser: { sub: string; role: string }) {
    if (currentUser.role === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!doctor) {
        throw new NotFoundException(
          'Doctor profile not found for this account',
        );
      }

      return this.prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        orderBy: { scheduledAt: 'asc' },
        include: {
          patient: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          department: { select: { name: true } },
          hospital: { select: { name: true } },
        },
      });
    }

    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found for this account');
    }

    return this.prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: { scheduledAt: 'asc' },
      include: {
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        department: { select: { name: true } },
        hospital: { select: { name: true } },
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        department: { select: { name: true } },
        hospital: { select: { name: true } },
      },
    });
  }
  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
    EMERGENCY: [],
  };

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    assertSameHospital(
      currentUser.hospitalId,
      appointment.hospitalId,
      currentUser.role as Role,
    );

    if (currentUser.role === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenException(
          'You can only update the status of your own appointments',
        );
      }
    }

    const allowedNextStatuses =
      AppointmentsService.ALLOWED_TRANSITIONS[appointment.status] ?? [];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new ConflictException(
        `Cannot transition from ${appointment.status} to ${dto.status}`,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: dto.status },
    });

    const patient = await this.prisma.patient.findUnique({
      where: { id: updated.patientId },
      select: { userId: true },
    });
    if (patient) {
      this.notificationsGateway.emitToUser(
        patient.userId,
        'appointment-status-changed',
        {
          appointmentId: updated.id,
          status: updated.status,
        },
      );
    }

    return updated;
  }

  
}
