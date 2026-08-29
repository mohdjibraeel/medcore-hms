import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// A standalone Prisma client pointed at whatever DATABASE_URL is currently
// set — when tests run via `dotenv -e .env.test`, that's medcore_test.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const testPrisma = new PrismaClient({ adapter });

const jwtService = new JwtService();
export const TEST_PASSWORD = 'TestPass123!';

// Signs a real, valid access token — same shape as auth.service.ts login() —
// so we can skip the OTP/email-verification flow in tests and log straight in.
function signAccessToken(user: {
  id: string;
  email: string;
  role: string;
  hospitalId: string | null;
}) {
  return jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
    },
    { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
  );
}

export interface SeededHospital {
  hospital: { id: string; name: string };
  department: { id: string; name: string };
  doctorUser: { id: string; email: string };
  doctor: { id: string };
  doctorToken: string;
  patientUser: { id: string; email: string };
  patient: { id: string };
  patientToken: string;
}

/**
 * Wipes every table that our tests touch, in an order that respects
 * foreign keys (children before parents). Safe to call before every test
 * because it ONLY ever runs against DATABASE_URL — which, in test runs,
 * is medcore_test, never your real database.
 */
export async function cleanupDatabase() {
  await testPrisma.auditLog.deleteMany();
  await testPrisma.dispensation.deleteMany();
  await testPrisma.invoiceItem.deleteMany();
  await testPrisma.invoice.deleteMany();
  await testPrisma.labOrderItem.deleteMany();
  await testPrisma.labTest.deleteMany();
  await testPrisma.labOrder.deleteMany();
  await testPrisma.prescriptionItem.deleteMany();
  await testPrisma.prescription.deleteMany();
  await testPrisma.medicineBatch.deleteMany();
  await testPrisma.medicine.deleteMany();
  await testPrisma.medicalRecord.deleteMany();
  await testPrisma.appointment.deleteMany();
  await testPrisma.doctor.deleteMany();
  await testPrisma.patient.deleteMany();
  await testPrisma.notification.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.department.deleteMany();
  await testPrisma.hospital.deleteMany();
  await testPrisma.address.deleteMany();
}

/**
 * Creates one fully-formed hospital: a department, one doctor (logged in,
 * token ready), and one patient (logged in, token ready).
 */
async function seedOneHospital(label: string): Promise<SeededHospital> {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

  const hospital = await testPrisma.hospital.create({
    data: {
      name: `Test Hospital ${label}`,
      slug: `test-hospital-${label.toLowerCase()}-${Date.now()}`,
      status: 'VERIFIED',
    },
  });

  const department = await testPrisma.department.create({
    data: { name: `Cardiology ${label}`, hospitalId: hospital.id },
  });

  const doctorUser = await testPrisma.user.create({
    data: {
      email: `doctor.${label.toLowerCase()}.${Date.now()}@test.medcore.com`,
      password: hashedPassword,
      role: 'DOCTOR',
      hospitalId: hospital.id,
      firstName: `Doctor${label}`,
      emailVerified: true,
    },
  });

  const doctor = await testPrisma.doctor.create({
    data: {
      userId: doctorUser.id,
      specialization: 'Cardiology',
      licenseNumber: `LIC-${label}-${Date.now()}`,
      departmentId: department.id,
    },
  });

  const patientUser = await testPrisma.user.create({
    data: {
      email: `patient.${label.toLowerCase()}.${Date.now()}@test.medcore.com`,
      password: hashedPassword,
      role: 'PATIENT',
      hospitalId: hospital.id,
      firstName: `Patient${label}`,
      emailVerified: true,
    },
  });

  const patient = await testPrisma.patient.create({
    data: { userId: patientUser.id, dateOfBirth: new Date('1995-01-01') },
  });

  return {
    hospital: { id: hospital.id, name: hospital.name },
    department: { id: department.id, name: department.name },
    doctorUser: { id: doctorUser.id, email: doctorUser.email },
    doctor: { id: doctor.id },
    doctorToken: signAccessToken({ ...doctorUser, hospitalId: hospital.id }),
    patientUser: { id: patientUser.id, email: patientUser.email },
    patient: { id: patient.id },
    patientToken: signAccessToken({ ...patientUser, hospitalId: hospital.id }),
  };
}

/**
 * The main entry point tests will call: gives you two completely separate
 * hospitals (A and B), each with their own doctor and patient — exactly
 * what the tenancy-isolation tests need.
 */
export async function seedTwoHospitals() {
  const hospitalA = await seedOneHospital('A');
  const hospitalB = await seedOneHospital('B');
  return { hospitalA, hospitalB };
}

/**
 * Creates one more patient in an existing hospital — used when a test
 * needs two different people (e.g. racing for the same appointment slot).
 */
export async function createExtraPatient(hospitalId: string, label: string) {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

  const patientUser = await testPrisma.user.create({
    data: {
      email: `patient.extra.${label.toLowerCase()}.${Date.now()}@test.medcore.com`,
      password: hashedPassword,
      role: 'PATIENT',
      hospitalId,
      firstName: `ExtraPatient${label}`,
      emailVerified: true,
    },
  });

  const patient = await testPrisma.patient.create({
    data: { userId: patientUser.id, dateOfBirth: new Date('1996-02-02') },
  });

  return {
    patientUser: { id: patientUser.id, email: patientUser.email },
    patient: { id: patient.id },
    patientToken: signAccessToken({ ...patientUser, hospitalId }),
  };
}

/**
 * Creates a staff user with any role (pharmacist, accountant, nurse, etc.)
 * at an existing hospital — reusable across tests that need staff beyond
 * just doctors and patients.
 */
export async function createStaffUser(hospitalId: string, role: string, label: string) {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

  const user = await testPrisma.user.create({
    data: {
      email: `${role.toLowerCase()}.${label.toLowerCase()}.${Date.now()}@test.medcore.com`,
      password: hashedPassword,
      role: role as any,
      hospitalId,
      firstName: `${role}${label}`,
      emailVerified: true,
    },
  });

  return {
    user: { id: user.id, email: user.email },
    token: signAccessToken({ ...user, hospitalId }),
  };
}