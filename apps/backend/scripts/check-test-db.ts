import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hospitals = await prisma.hospital.count();
  const users = await prisma.user.count();
  const patients = await prisma.patient.count();
  const appointments = await prisma.appointment.count();
  const auditLogs = await prisma.auditLog.count();

  console.log({ hospitals, users, patients, appointments, auditLogs });
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());