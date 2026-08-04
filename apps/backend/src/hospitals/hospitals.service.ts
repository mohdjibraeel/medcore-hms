import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';

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
}