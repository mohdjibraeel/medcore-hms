import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateMedicalRecordDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (currentUser.role === 'DOCTOR') {
      const callingDoctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!callingDoctor) {
        throw new NotFoundException(
          'Doctor profile not found for this account',
        );
      }
      if (appointment.doctorId !== callingDoctor.id) {
        throw new ForbiddenException(
          'You are not the assigned doctor for this appointment',
        );
      }
    } else if (currentUser.role === 'NURSE') {
      // Nurses aren't tied to one specific doctor — just require they work
      // at the same hospital as this appointment.
      if (
        !currentUser.hospitalId ||
        currentUser.hospitalId !== appointment.hospitalId
      ) {
        throw new ForbiddenException(
          'You can only record vitals for appointments at your own hospital',
        );
      }
    } else {
      throw new ForbiddenException(
        'Only doctors and nurses can create medical records',
      );
    }

    const existing = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException(
        'A medical record already exists for this appointment',
      );
    }

    return this.prisma.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        chiefComplaint: dto.chiefComplaint,
        bloodPressure: dto.bloodPressure,
        pulse: dto.pulse,
        temperature: dto.temperature,
        spo2: dto.spo2,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        diagnosis: dto.diagnosis,
        treatmentPlan: dto.treatmentPlan,
        allergies: dto.allergies,
      },
    });
  }

  async findByPatient(
    patientId: string,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (currentUser.role === 'PATIENT' && patient.userId !== currentUser.sub) {
      throw new ForbiddenException(
        'You can only view your own medical records',
      );
    }

    const isStaffScoped =
      currentUser.role !== 'PATIENT' && currentUser.role !== 'SUPER_ADMIN';

    if (isStaffScoped && !currentUser.hospitalId) {
      throw new ForbiddenException(
        'Staff account is not assigned to a hospital',
      );
    }

    // Narrowed here: TS now knows this is `string`, not `string | null`,
    // because we already threw above if it was falsy for staff.
    const staffHospitalId = currentUser.hospitalId as string;

    return this.prisma.medicalRecord.findMany({
      where: {
        patientId,
        ...(isStaffScoped && {
          appointment: { hospitalId: staffHospitalId },
        }),
      },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        appointment: { select: { scheduledAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAppointment(
    appointmentId: string,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (currentUser.role === 'DOCTOR') {
      const callingDoctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!callingDoctor || appointment.doctorId !== callingDoctor.id) {
        throw new ForbiddenException(
          'You are not the assigned doctor for this appointment',
        );
      }
    } else if (currentUser.role === 'NURSE') {
      if (
        !currentUser.hospitalId ||
        currentUser.hospitalId !== appointment.hospitalId
      ) {
        throw new ForbiddenException(
          'You can only view records for appointments at your own hospital',
        );
      }
    } else {
      throw new ForbiddenException(
        'Only doctors and nurses can view this encounter record',
      );
    }

    // Intentionally returns null rather than throwing when nothing exists yet —
    // "not filled in yet" is a normal, expected state for this check, not an error.
    return this.prisma.medicalRecord.findUnique({
      where: { appointmentId },
    });
  }
}
