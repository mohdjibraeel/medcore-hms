import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateDepartmentDto,
    currentUser: { sub: string; role: string; hospitalId: string | null },
  ) {
    // Server decides the hospital for non-SUPER_ADMIN callers — the client-supplied
    // dto.hospitalId is ignored for HOSPITAL_ADMIN, preventing them from creating
    // a department at a hospital they don't belong to.
    const isStaffScoped = currentUser.role !== 'SUPER_ADMIN';

    if (isStaffScoped && !currentUser.hospitalId) {
      throw new ForbiddenException  (
        'Staff account is not assigned to a hospital',
      );
    }

    const effectiveHospitalId = isStaffScoped
      ? currentUser.hospitalId!
      : dto.hospitalId;

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: effectiveHospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        hospitalId: effectiveHospitalId,
      },
    });
  }

  async findByHospital(hospitalId: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.department.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
