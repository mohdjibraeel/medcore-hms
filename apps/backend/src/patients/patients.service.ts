import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async search(search: string | undefined, hospitalId: string) {
  const patients = await this.prisma.patient.findMany({
    where: {
      appointments: {
        some: { hospitalId },
      },
      ...(search && {
        user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }),
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    take: 20,
  });

  return patients.map((p) => ({
    id: p.id,
    firstName: p.user.firstName,
    lastName: p.user.lastName,
    email: p.user.email,
    dateOfBirth: p.dateOfBirth,
  }));
}
}