import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import {
  seedTwoHospitals,
  createExtraPatient,
  cleanupDatabase,
  testPrisma,
  SeededHospital,
} from './helpers/seed.helper';

describe('Concurrent Appointment Booking (e2e)', () => {
  let app: INestApplication;
  let hospitalA: SeededHospital;
  let secondPatientToken: string;
  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase();

    const seeded = await seedTwoHospitals();
    hospitalA = seeded.hospitalA;

    const extraPatient = await createExtraPatient(hospitalA.hospital.id, 'A2');
    secondPatientToken = extraPatient.patientToken;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await testPrisma.$disconnect();
    await app.close();
  });

  it('only allows ONE of two simultaneous bookings for the same doctor + time slot to succeed', async () => {
    const bookingPayload = {
      doctorId: hospitalA.doctor.id,
      departmentId: hospitalA.department.id,
      hospitalId: hospitalA.hospital.id,
      scheduledAt,
    };

    // Fire both requests at the same time — no awaiting one before the
    // other — so they genuinely race each other, just like two real
    // patients tapping "book" within the same second.
    const [responseOne, responseTwo] = await Promise.all([
      request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${hospitalA.patientToken}`)
        .send(bookingPayload),
      request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${secondPatientToken}`)
        .send(bookingPayload),
    ]);

    const statuses = [responseOne.status, responseTwo.status].sort();

    // Exactly one must succeed (201) and the other must be rejected (409)
    // — never both succeeding, never both failing.
    expect(statuses).toEqual([201, 409]);

    // Belt-and-braces check directly against the database: there should
    // be exactly ONE appointment row for this doctor at this exact time.
    const appointmentsAtThisSlot = await testPrisma.appointment.findMany({
      where: {
        doctorId: hospitalA.doctor.id,
        scheduledAt: new Date(scheduledAt),
      },
    });
    expect(appointmentsAtThisSlot.length).toBe(1);
  });
});