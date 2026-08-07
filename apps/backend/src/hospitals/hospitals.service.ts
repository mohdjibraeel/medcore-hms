import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalStatusDto } from './dto/update-status.dto';

@Injectable()
export class HospitalsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHospitalDto) {
    const existing = await this.prisma.hospital.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('A hospital with this slug already exists');
    }

    return this.prisma.hospital.create({
      data: {
        name: dto.name,
        slug: dto.slug,
      },
    });
  }

  async updateStatus(id:string,dto: UpdateHospitalStatusDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
    });

    if(!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    return this.prisma.hospital.update({
      where: { id },
      data: { status: dto.status },
    });
  } 

  async findAll() {
    return this.prisma.hospital.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}