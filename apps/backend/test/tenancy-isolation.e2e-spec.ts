import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import {
  seedTwoHospitals,
  cleanupDatabase,
  testPrisma,
  SeededHospital,
} from './helpers/seed.helper';

describe('Tenancy Isolation (e2e)', () => {
  let app: INestApplication;
  let hospitalA: SeededHospital;
  let hospitalB: SeededHospital;
  let recordId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase();

    const seeded = await seedTwoHospitals();
    hospitalA = seeded.hospitalA;
    hospitalB = seeded.hospitalB;

    // Create one real appointment + medical record for Hospital B's patient,
    // seen by Hospital B's doctor — this is the "real data" we'll try to
    // reach from the wrong side of the wall.
    const appointment = await testPrisma.appointment.create({
      data: {
        patientId: hospitalB.patient.id,
        doctorId: hospitalB.doctor.id,
        departmentId: hospitalB.department.id,
        hospitalId: hospitalB.hospital.id,
        scheduledAt: new Date(),
        status: 'COMPLETED',
      },
    });

    const record = await testPrisma.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        patientId: hospitalB.patient.id,
        doctorId: hospitalB.doctor.id,
        chiefComplaint: 'Chest pain',
        diagnosis: 'Test diagnosis — Hospital B only',
      },
    });
    recordId = record.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await testPrisma.$disconnect();
    await app.close();
  });

  it("blocks Hospital A's doctor from seeing Hospital B's patient records", async () => {
    const res = await request(app.getHttpServer())
      .get(`/medical-records/${hospitalB.patient.id}`)
      .set('Authorization', `Bearer ${hospitalA.doctorToken}`)
      .expect(200);

    // The record exists in the DB, but must not appear for a doctor
    // outside that patient's hospital.
    expect(res.body.data).toEqual([]);
  });

  it("allows Hospital B's own doctor to see their hospital's patient records", async () => {
    const res = await request(app.getHttpServer())
      .get(`/medical-records/${hospitalB.patient.id}`)
      .set('Authorization', `Bearer ${hospitalB.doctorToken}`)
      .expect(200);

    // Positive control: proves the endpoint actually works for the
    // legitimate case, so test #1 passing isn't an accident.
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(recordId);
  });

  it('blocks a patient from viewing another patient\'s medical records', async () => {
    const res = await request(app.getHttpServer())
      .get(`/medical-records/${hospitalB.patient.id}`)
      .set('Authorization', `Bearer ${hospitalA.patientToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a patient to view their own medical records', async () => {
    const res = await request(app.getHttpServer())
      .get(`/medical-records/${hospitalB.patient.id}`)
      .set('Authorization', `Bearer ${hospitalB.patientToken}`)
      .expect(200);

    expect(res.body.data.length).toBe(1);
  });

  it("hides Hospital B's patient from Hospital A's patient search", async () => {
    const res = await request(app.getHttpServer())
      .get('/patients')
      .query({ search: hospitalB.patientUser.email })
      .set('Authorization', `Bearer ${hospitalA.doctorToken}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
  });
});