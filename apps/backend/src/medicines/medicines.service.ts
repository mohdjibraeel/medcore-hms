import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.medicine.findMany({
      include: {
        hospital: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}