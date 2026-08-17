import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDoctorDto } from '../doctors/dto/create-doctor.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateDoctorDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    const isStaffScoped =
      currentUser.role !== 'PATIENT' && currentUser.role !== 'SUPER_ADMIN';

    if (isStaffScoped && !currentUser.hospitalId) {
      throw new ForbiddenException(
        'Staff account is not assigned to a hospital',
      );
    }

    // Staff (e.g. Hospital Admin): hospitalId is forced from their own account,
    // never trusted from the request body.
    // Super Admin: may create a doctor at any hospital, so dto.hospitalId is honored.
    const effectiveHospitalId = isStaffScoped
      ? currentUser.hospitalId!
      : dto.hospitalId;

    const hospital = await this.prisma.hospital.findUnique({
      where: {
        id: effectiveHospitalId,
      },
    });
    if (!hospital) {
      throw new NotFoundException(`Hospital not found`);
    }

    const department = await this.prisma.department.findUnique({
      where: {
        id: dto.departmentId,
      },
    });
    if (!department) {
      throw new NotFoundException(`Department not found`);
    }

    // The department must belong to the hospital we're actually creating under —
    // otherwise a caller could pass a valid but unrelated department id from another hospital.
    if (department.hospitalId !== effectiveHospitalId) {
      throw new ForbiddenException(
        `Department does not belong to the target hospital`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const hashedPassword = await bcrypt.hash(dto.password, 12);

        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            role: 'DOCTOR',
            hospitalId: effectiveHospitalId,
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
        maxWait: 10000,
        timeout: 15000,
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
