import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import {
  seedTwoHospitals,
  createStaffUser,
  cleanupDatabase,
  testPrisma,
  SeededHospital,
} from './helpers/seed.helper';

describe('Expired Medicine Dispensing Protection (e2e)', () => {
  let app: INestApplication;
  let hospitalA: SeededHospital;
  let pharmacistToken: string;
  let prescriptionItemId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase();

    const seeded = await seedTwoHospitals();
    hospitalA = seeded.hospitalA;

    const pharmacist = await createStaffUser(hospitalA.hospital.id, 'PHARMACIST', 'P1');
    pharmacistToken = pharmacist.token;

    const medicine = await testPrisma.medicine.create({
      data: { name: 'Test Amoxicillin', form: 'TABLET', hospitalId: hospitalA.hospital.id },
    });

    // The ONLY batch in stock for this medicine is already expired —
    // there is no valid stock at all for the system to fall back on.
    await testPrisma.medicineBatch.create({
      data: {
        medicineId: medicine.id,
        batchNumber: 'EXPIRED-BATCH-001',
        manufactureDate: new Date('2023-01-01'),
        expiryDate: new Date('2024-01-01'), // in the past
        quantity: 100,
        unitCost: 1.5,
        mrp: 3.0,
        isQuarantined: false,
      },
    });

    const appointment = await testPrisma.appointment.create({
      data: {
        patientId: hospitalA.patient.id,
        doctorId: hospitalA.doctor.id,
        departmentId: hospitalA.department.id,
        hospitalId: hospitalA.hospital.id,
        scheduledAt: new Date(),
        status: 'COMPLETED',
      },
    });

    const medicalRecord = await testPrisma.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        patientId: hospitalA.patient.id,
        doctorId: hospitalA.doctor.id,
        chiefComplaint: 'Infection',
        diagnosis: 'Bacterial infection',
      },
    });

    const prescription = await testPrisma.prescription.create({
      data: {
        medicalRecordId: medicalRecord.id,
        doctorId: hospitalA.doctor.id,
        patientId: hospitalA.patient.id,
      },
    });

    const prescriptionItem = await testPrisma.prescriptionItem.create({
      data: {
        prescriptionId: prescription.id,
        medicineId: medicine.id,
        dosage: '500mg',
        dosageUnit: 'mg',
        frequency: 'BD',
        durationDays: 5,
        quantity: 10,
      },
    });
    prescriptionItemId = prescriptionItem.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await testPrisma.$disconnect();
    await app.close();
  });

  it('refuses to dispense when the only available stock is expired', async () => {
    const res = await request(app.getHttpServer())
      .post('/dispense')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({ prescriptionItemId, quantity: 5 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('No valid');

    // Confirm at the database level too: no dispensation record should
    // have been created, and the expired batch's quantity must be untouched.
    const dispensations = await testPrisma.dispensation.findMany({
      where: { prescriptionItemId },
    });
    expect(dispensations.length).toBe(0);
  });
});