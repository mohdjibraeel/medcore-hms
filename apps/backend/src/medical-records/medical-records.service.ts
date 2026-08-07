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
    currentUser: { sub: string; role: string },
  ) {
    // 1. Appointment must exist
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // 2. Caller must have a Doctor profile
    const callingDoctor = await this.prisma.doctor.findUnique({
      where: { userId: currentUser.sub },
    });
    if (!callingDoctor) {
      throw new NotFoundException('Doctor profile not found for this account');
    }

    // 3. Caller must be the doctor assigned to this specific appointment
    if (appointment.doctorId !== callingDoctor.id) {
      throw new ForbiddenException(
        'You are not the assigned doctor for this appointment',
      );
    }

    // 4. No duplicate MedicalRecord for this appointment (appointmentId is @unique)
    const existing = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException(
        'A medical record already exists for this appointment',
      );
    }

    // 5. Create — patientId/doctorId derived from Appointment, never trusted from DTO
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
    currentUser: { sub: string; role: string },
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

    return this.prisma.medicalRecord.findMany({
      where: { patientId },
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
}
