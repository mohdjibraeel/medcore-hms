import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

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

    return this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        departmentId: dto.departmentId,
        hospitalId: dto.hospitalId,
        scheduledAt: new Date(dto.scheduledAt),
        isEmergency: dto.isEmergency ?? false,
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

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
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
