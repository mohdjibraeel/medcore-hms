import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateMedicalRecordDto) {
    // STEP 1: Look up the appointment to verify it exists and get doctor/patient IDs
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        doctor: {
          select: { userId: true }
        }
      }
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${dto.appointmentId} not found`);
    }

    // STEP 2: Get the calling user's Doctor profile
    const callingDoctor = await this.prisma.doctor.findUnique({
      where: { userId: userId }
    });

    if (!callingDoctor) {
      throw new ForbiddenException('You do not have a doctor profile');
    }

    // STEP 3: AUTHORIZATION — only the assigned doctor can create the record
    if (appointment.doctorId !== callingDoctor.id) {
      throw new ForbiddenException(
        'You are not the assigned doctor for this appointment'
      );
    }

    // STEP 4: Check if a MedicalRecord already exists for this appointment
    const existingRecord = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: dto.appointmentId }
    });

    if (existingRecord) {
      throw new ConflictException(
        `Medical record already exists for appointment ${dto.appointmentId}`
      );
    }

    // STEP 5: Create the record — patientId/doctorId DERIVED from appointment, NOT from DTO
    return this.prisma.medicalRecord.create({
      data: {
        appointmentId: dto.appointmentId,
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
      include: {
        patient: {
          include: { user: true }
        },
        doctor: {
          include: { user: true }
        }
      }
    });
  }
}