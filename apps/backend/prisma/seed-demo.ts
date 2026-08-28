import {
  PrismaClient,
  Role,
  HospitalStatus,
  AppointmentStatus,
  MedicineForm,
  Frequency,
  LabOrderStatus,
  InvoiceStatus,
  InvoiceItemCategory,
} from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = 'Demo@123';
const BCRYPT_COST = 12;

faker.seed(1234);

async function hash(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

async function resetDemoData() {
  console.log('Resetting existing demo data...');
  await prisma.dispensation.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.labOrderItem.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.medicineBatch.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medcore.demo' } } });
  await prisma.department.deleteMany();
  await prisma.hospital.deleteMany({ where: { slug: { in: ['apollo-care-demo', 'metro-health-demo'] } } });
  console.log('Reset complete.\n');
}

async function main() {
  const shouldReset = process.argv.includes('--reset');

  const existing = await prisma.hospital.findUnique({ where: { slug: 'apollo-care-demo' } });
  if (existing && !shouldReset) {
    console.log('Demo data already exists (apollo-care-demo found). Run with --reset to wipe and reseed.');
    return;
  }
  if (existing && shouldReset) {
    await resetDemoData();
  }

  console.log('Seeding demo data...\n');

  const addressA = await prisma.address.create({
    data: { line1: '221 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  });
  const addressB = await prisma.address.create({
    data: { line1: '58 Linking Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
  });

  const hospitalA = await prisma.hospital.create({
    data: { name: 'Apollo Care Multispecialty Hospital', slug: 'apollo-care-demo', status: HospitalStatus.VERIFIED, addressId: addressA.id },
  });
  const hospitalB = await prisma.hospital.create({
    data: { name: 'Metro Health Institute', slug: 'metro-health-demo', status: HospitalStatus.VERIFIED, addressId: addressB.id },
  });
  const hospitals = [hospitalA, hospitalB];

  const specializations = ['Cardiology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'Dermatology', 'ENT', 'Gynecology', 'Neurology'];
  const departmentsByHospital: Record<string, { id: string; name: string }[]> = { [hospitalA.id]: [], [hospitalB.id]: [] };
  for (let i = 0; i < specializations.length; i++) {
    const hospital = i < 4 ? hospitalA : hospitalB;
    const dept = await prisma.department.create({ data: { name: specializations[i], hospitalId: hospital.id } });
    departmentsByHospital[hospital.id].push(dept);
  }

  const demoCredentials: { role: string; email: string; password: string; hospital?: string }[] = [];
  demoCredentials.push({ role: 'SUPER_ADMIN (existing)', email: 'admin@medcore.com', password: 'SuperAdmin@123' });

  const staffRoles: { role: Role; label: string }[] = [
    { role: Role.HOSPITAL_ADMIN, label: 'hospitaladmin' },
    { role: Role.NURSE, label: 'nurse' },
    { role: Role.RECEPTIONIST, label: 'receptionist' },
    { role: Role.LAB_TECHNICIAN, label: 'labtech' },
    { role: Role.PHARMACIST, label: 'pharmacist' },
    { role: Role.ACCOUNTANT, label: 'accountant' },
  ];
  const staffPassword = await hash(DEMO_PASSWORD);
  for (const hospital of hospitals) {
    const suffix = hospital.id === hospitalA.id ? 'apollo' : 'metro';
    for (const { role, label } of staffRoles) {
      const email = `${label}.${suffix}@medcore.demo`;
      await prisma.user.create({
        data: {
          email,
          password: staffPassword,
          role,
          hospitalId: hospital.id,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          emailVerified: true,
        },
      });
      if (hospital.id === hospitalA.id) {
        demoCredentials.push({ role, email, password: DEMO_PASSWORD, hospital: hospital.name });
      }
    }
  }

  const doctorPassword = await hash(DEMO_PASSWORD);
  const doctors: { id: string; hospitalId: string; departmentId: string }[] = [];
  let licenseCounter = 1000;
  for (const hospital of hospitals) {
    for (const dept of departmentsByHospital[hospital.id]) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `dr.${firstName.toLowerCase()}.${dept.name.toLowerCase().replace(/\s+/g, '')}@medcore.demo`;
      const user = await prisma.user.create({
        data: { email, password: doctorPassword, role: Role.DOCTOR, hospitalId: hospital.id, firstName, lastName, emailVerified: true },
      });
      const doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          specialization: dept.name,
          licenseNumber: `MCI-${licenseCounter++}`,
          departmentId: dept.id,
          consultationFee: faker.number.int({ min: 300, max: 1200 }),
        },
      });
      doctors.push({ id: doctor.id, hospitalId: hospital.id, departmentId: dept.id });
      if (hospital.id === hospitalA.id) {
        demoCredentials.push({ role: `DOCTOR (${dept.name})`, email, password: DEMO_PASSWORD, hospital: hospital.name });
      }
    }
  }

  const patientPassword = await hash(DEMO_PASSWORD);
  const patients: { id: string; email: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName, provider: 'medcore.demo' }).toLowerCase();
    const user = await prisma.user.create({
      data: { email, password: patientPassword, role: Role.PATIENT, firstName, lastName, emailVerified: true },
    });
    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        dateOfBirth: faker.date.birthdate({ min: 5, max: 85, mode: 'age' }),
        bloodGroup: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
      },
    });
    patients.push({ id: patient.id, email });
  }
  demoCredentials.push({ role: 'PATIENT', email: patients[0].email, password: DEMO_PASSWORD });

  const medicineNames = ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Ibuprofen 400mg', 'Cetirizine 10mg', 'Omeprazole 20mg', 'Metformin 500mg'];
  const medicinesByHospital: Record<string, { id: string }[]> = { [hospitalA.id]: [], [hospitalB.id]: [] };
  for (const hospital of hospitals) {
    for (const name of medicineNames) {
      const medicine = await prisma.medicine.create({ data: { name, form: MedicineForm.TABLET, hospitalId: hospital.id, reorderLevel: 10 } });
      await prisma.medicineBatch.create({
        data: {
          medicineId: medicine.id,
          batchNumber: `B-${faker.string.alphanumeric(6).toUpperCase()}`,
          manufactureDate: faker.date.past({ years: 1 }),
          expiryDate: faker.date.future({ years: 1 }),
          quantity: faker.number.int({ min: 50, max: 200 }),
          unitCost: faker.number.float({ min: 1, max: 20, fractionDigits: 2 }),
          mrp: faker.number.float({ min: 5, max: 40, fractionDigits: 2 }),
        },
      });
      medicinesByHospital[hospital.id].push(medicine);
    }
  }

  const labTestDefs = [
    { name: 'Hemoglobin', unit: 'g/dL', low: 13.0, high: 17.5 },
    { name: 'WBC Count', unit: 'cells/mcL', low: 4500, high: 11000 },
    { name: 'Fasting Blood Sugar', unit: 'mg/dL', low: 70, high: 100 },
    { name: 'Creatinine', unit: 'mg/dL', low: 0.6, high: 1.3 },
    { name: 'Total Cholesterol', unit: 'mg/dL', low: 125, high: 200 },
  ];
  const labTestsByHospital: Record<string, { id: string; low: number; high: number }[]> = { [hospitalA.id]: [], [hospitalB.id]: [] };
  for (const hospital of hospitals) {
    for (const t of labTestDefs) {
      const test = await prisma.labTest.create({
        data: { name: t.name, unit: t.unit, refRangeLow: t.low, refRangeHigh: t.high, price: faker.number.int({ min: 150, max: 800 }), hospitalId: hospital.id },
      });
      labTestsByHospital[hospital.id].push({ id: test.id, low: t.low, high: t.high });
    }
  }

  const chiefComplaints = ['Fever and body ache', 'Persistent cough', 'Chest discomfort', 'Joint pain', 'Skin rash', 'Routine checkup', 'Headache', 'Abdominal pain'];
  let completedWithRecords = 0;

  for (const hospital of hospitals) {
    const hospDoctors = doctors.filter((d) => d.hospitalId === hospital.id);

    for (let i = 0; i < 30; i++) {
      const daysAgo = faker.number.int({ min: -3, max: 14 });
      const refDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const scheduledAt = faker.date.soon({ days: 1, refDate });
      const isPast = daysAgo > 0;
      const doctor = faker.helpers.arrayElement(hospDoctors);
      const patient = faker.helpers.arrayElement(patients);

      const status: AppointmentStatus = !isPast
        ? faker.helpers.arrayElement([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
        : faker.helpers.weightedArrayElement([
            { value: AppointmentStatus.COMPLETED, weight: 7 },
            { value: AppointmentStatus.CANCELLED, weight: 2 },
            { value: AppointmentStatus.NO_SHOW, weight: 1 },
          ]);

      const appointment = await prisma.appointment.create({
        data: { patientId: patient.id, doctorId: doctor.id, departmentId: doctor.departmentId, hospitalId: hospital.id, scheduledAt, status },
      });

      if (status === AppointmentStatus.COMPLETED && faker.datatype.boolean({ probability: 0.7 })) {
        const record = await prisma.medicalRecord.create({
          data: {
            appointmentId: appointment.id,
            patientId: patient.id,
            doctorId: doctor.id,
            chiefComplaint: faker.helpers.arrayElement(chiefComplaints),
            diagnosis: faker.lorem.words({ min: 2, max: 5 }),
            treatmentPlan: faker.lorem.sentence(),
            bloodPressure: `${faker.number.int({ min: 100, max: 140 })}/${faker.number.int({ min: 60, max: 90 })}`,
            pulse: faker.number.int({ min: 60, max: 100 }),
            temperature: faker.number.float({ min: 97, max: 101, fractionDigits: 1 }),
            spo2: faker.number.int({ min: 94, max: 100 }),
          },
        });
        completedWithRecords++;

        if (faker.datatype.boolean({ probability: 0.65 })) {
          const prescription = await prisma.prescription.create({ data: { medicalRecordId: record.id, doctorId: doctor.id, patientId: patient.id } });
          const chosenMeds = faker.helpers.arrayElements(medicinesByHospital[hospital.id], faker.number.int({ min: 1, max: 3 }));
          for (const med of chosenMeds) {
            await prisma.prescriptionItem.create({
              data: {
                prescriptionId: prescription.id,
                medicineId: med.id,
                dosage: '1 tablet',
                frequency: faker.helpers.arrayElement([Frequency.OD, Frequency.BD, Frequency.TDS]),
                durationDays: faker.number.int({ min: 3, max: 10 }),
                dosageUnit: 'tablet',
                quantity: faker.number.int({ min: 6, max: 30 }),
              },
            });
          }
        }

        if (faker.datatype.boolean({ probability: 0.4 })) {
          const labOrder = await prisma.labOrder.create({ data: { medicalRecordId: record.id, status: LabOrderStatus.APPROVED } });
          const chosenTests = faker.helpers.arrayElements(labTestsByHospital[hospital.id], faker.number.int({ min: 1, max: 2 }));
          for (const t of chosenTests) {
            const resultValue = faker.number.float({ min: t.low * 0.85, max: t.high * 1.15, fractionDigits: 1 });
            await prisma.labOrderItem.create({
              data: { labOrderId: labOrder.id, labTestId: t.id, resultValue, isFlagged: resultValue < t.low || resultValue > t.high },
            });
          }
        }

        if (faker.datatype.boolean({ probability: 0.8 })) {
          const consultFee = faker.number.int({ min: 300, max: 1200 });
          const invoice = await prisma.invoice.create({
            data: {
              appointmentId: appointment.id,
              patientId: patient.id,
              hospitalId: hospital.id,
              status: faker.helpers.arrayElement([InvoiceStatus.PAID, InvoiceStatus.FINALIZED]),
              totalAmount: consultFee,
            },
          });
          await prisma.invoiceItem.create({
            data: { invoiceId: invoice.id, description: 'Consultation fee', category: InvoiceItemCategory.CONSULTATION, amount: consultFee },
          });
        }
      }
    }
  }

  console.log(`Seeded 2 hospitals, ${specializations.length} departments, ${doctors.length} doctors, ${patients.length} patients.`);
  console.log(`Created medical records for ${completedWithRecords} completed appointments.\n`);

  console.log('=== DEMO CREDENTIALS (password for all new accounts: Demo@123) ===');
  for (const c of demoCredentials) {
    console.log(`${c.role.padEnd(28)} ${c.email}${c.hospital ? '  (' + c.hospital + ')' : ''}  [pw: ${c.password}]`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });