import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        hospitalId: dto.hospitalId,
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