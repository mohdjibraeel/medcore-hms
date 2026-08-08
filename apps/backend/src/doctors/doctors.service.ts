import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDoctorDto } from '../doctors/dto/create-doctor.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDoctorDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: {
        id: dto.hospitalId,
      },
    });
    if (!hospital) {
      throw new NotFoundException(`Hospital not found`);
    }

    const deparment = await this.prisma.department.findUnique({
      where: {
        id: dto.departmentId,
      },
    });
    if (!deparment) {
      throw new NotFoundException(`Department not found`);
    }
    return this.prisma.$transaction(
      async (tx) => {
        const hashedPassword = await bcrypt.hash(dto.password, 12);

        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            role: 'DOCTOR',
            hospitalId: dto.hospitalId,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });

        const doctor = await tx.doctor.create({
          data: {
            userId: user.id,
            specialization: dto.specialization,
            licenseNumber: dto.licenseNumber,
            departmentId: dto.departmentId,
          },
        });

        return doctor;
      },
      {
        maxWait: 10000, // max time to wait for a connection to become available
        timeout: 15000, // max time the transaction itself is allowed to run
      },
    );
  }

  async findAll(
    currentUser: { sub: string; role: string; hospitalId: string | null },
    hospitalId?: string,
    specialization?: string,
  ) {
    const isStaffScoped =
      currentUser.role !== 'PATIENT' && currentUser.role !== 'SUPER_ADMIN';

    if (isStaffScoped && !currentUser.hospitalId) {
      throw new ForbiddenException(
        'Staff account is not assigned to a hospital',
      );
    }

    // Staff: hospitalId is forced from their own account, never trusted from the query string.
    // Patient/Super Admin: query param is an honest search filter (or omitted = search everywhere).
    const effectiveHospitalId = isStaffScoped
      ? currentUser.hospitalId!
      : hospitalId;

    return this.prisma.doctor.findMany({
      where: {
        ...(effectiveHospitalId && {
          user: { hospitalId: effectiveHospitalId },
        }),
        ...(specialization && {
          specialization: { contains: specialization, mode: 'insensitive' },
        }),
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        department: {
          select: { name: true },
        },
      },
    });
  }
}
