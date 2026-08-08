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

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateAppointmentDto,
    currentUser: { sub: string; role: string },
  ) {
    let patientId: string;

    if (currentUser.role === 'PATIENT') {
      // Ignore whatever dto.patientId might contain — resolve from the caller's own identity
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
      // Staff booking on behalf of someone — dto.patientId is required in this case
      if (!dto.patientId) {
        throw new ForbiddenException(
          'patientId is required when booking on behalf of a patient',
        );
      }
      patientId = dto.patientId;
    }

    // FK existence checks — same pattern as Doctors
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
        // Lock the Doctor row itself so that any concurrent booking attempt
        // for this same doctor has to wait here until this transaction
        // finishes. We lock the Doctor (not the Appointment) because the
        // appointment slot we're checking may not exist as a row yet —
        // FOR UPDATE can only lock rows that already exist.
        await tx.$queryRaw`SELECT id FROM "Doctor" WHERE id = ${dto.doctorId} FOR UPDATE`;

        // Now that we hold the lock, nobody else booking THIS doctor can
        // run this same check until we're done — so this check-then-create
        // is effectively atomic with respect to other booking attempts.
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

    // Tenancy check FIRST — before computing/validating any state transition.
    // No point telling a caller "invalid transition" for a record they
    // shouldn't even know exists.
    assertSameHospital(
      currentUser.hospitalId,
      appointment.hospitalId,
      currentUser.role as Role,
    );

    // Ownership check for DOCTOR specifically — hospital-level tenancy alone
    // isn't enough here, since two doctors can share a hospital. A doctor
    // should only be able to update appointments that are actually theirs.
    // RECEPTIONIST/HOSPITAL_ADMIN/SUPER_ADMIN are intentionally exempt —
    // managing the whole hospital's schedule across doctors is their job.
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

    return this.prisma.appointment.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
