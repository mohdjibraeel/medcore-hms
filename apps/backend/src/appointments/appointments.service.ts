import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from 'generated/prisma/client';

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

  async findAll(query: { patientId?: string; doctorId?: string }) {
    const where: any = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.doctorId) where.doctorId = query.doctorId;

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        department: true,
        hospital: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async updateStatus(appointmentId: string, newStatus: AppointmentStatus) {
    // Check if appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    // Update status
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: newStatus },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        department: true,
        hospital: true,
      },
    });
  }
}
