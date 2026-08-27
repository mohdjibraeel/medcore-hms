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

describe('Invoice Integrity (e2e)', () => {
  let app: INestApplication;
  let hospitalA: SeededHospital;
  let accountantToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase();

    const seeded = await seedTwoHospitals();
    hospitalA = seeded.hospitalA;

    const accountant = await createStaffUser(hospitalA.hospital.id, 'ACCOUNTANT', 'A1');
    accountantToken = accountant.token;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await testPrisma.$disconnect();
    await app.close();
  });

  async function createAppointment() {
    return testPrisma.appointment.create({
      data: {
        patientId: hospitalA.patient.id,
        doctorId: hospitalA.doctor.id,
        departmentId: hospitalA.department.id,
        hospitalId: hospitalA.hospital.id,
        scheduledAt: new Date(),
        status: 'COMPLETED',
      },
    });
  }

  it('keeps the invoice total in sync as line items are added one at a time', async () => {
    const appointment = await createAppointment();

    const invoiceRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ appointmentId: appointment.id })
      .expect(201);

    const invoiceId = invoiceRes.body.data.id;
    const amounts = [500, 1200.5, 75.25];

    let lastResponse;
    for (const amount of amounts) {
      lastResponse = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/items`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ description: `Charge ${amount}`, category: 'OTHER', amount })
        .expect(201);
    }

    const expectedTotal = amounts.reduce((sum, a) => sum + a, 0);
    expect(lastResponse!.body.data.totalAmount).toBeCloseTo(expectedTotal, 2);

    // Cross-check directly against the database, independent of the API's
    // own math, so a bug in the calculation can't hide behind itself.
    const items = await testPrisma.invoiceItem.findMany({ where: { invoiceId } });
    const dbSum = items.reduce((sum, item) => sum + item.amount, 0);
    expect(dbSum).toBeCloseTo(expectedTotal, 2);
  });

  it('keeps the invoice total correct even when two line items are added at the exact same time', async () => {
    const appointment = await createAppointment();

    const invoiceRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ appointmentId: appointment.id })
      .expect(201);

    const invoiceId = invoiceRes.body.data.id;

    // Two "receptionists" adding charges to the same bill in the same instant.
    await Promise.all([
      request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/items`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ description: 'Consultation', category: 'CONSULTATION', amount: 300 }),
      request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/items`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ description: 'Lab test', category: 'LAB', amount: 450 }),
    ]);

    // Both items should exist...
    const items = await testPrisma.invoiceItem.findMany({ where: { invoiceId } });
    expect(items.length).toBe(2);

    // ...AND the invoice's stored total must reflect BOTH of them, not
    // just whichever request happened to finish last.
    const invoice = await testPrisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(invoice!.totalAmount).toBeCloseTo(750, 2);
  });
});