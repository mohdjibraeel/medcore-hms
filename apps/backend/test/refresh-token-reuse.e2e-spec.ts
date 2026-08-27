import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import {
  seedTwoHospitals,
  cleanupDatabase,
  testPrisma,
  TEST_PASSWORD,
  SeededHospital,
} from './helpers/seed.helper';

// Pulls just the refresh_token cookie out of a raw Set-Cookie header array,
// so we can manually attach it to later requests.
function extractRefreshCookie(setCookieHeader: string[]): string {
  const cookie = setCookieHeader.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('No refresh_token cookie found in response');
  return cookie.split(';')[0]; // just "refresh_token=xyz", drop attributes
}

describe('Refresh Token Reuse Protection (e2e)', () => {
  let app: INestApplication;
  let hospitalA: SeededHospital;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase();
    const seeded = await seedTwoHospitals();
    hospitalA = seeded.hospitalA;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await testPrisma.$disconnect();
    await app.close();
  });

  it('blocks reuse of an old refresh token after it has already been rotated', async () => {
    // Step 1: log in for real, using the same credentials the seed
    // helper created (real bcrypt hash, real password).
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: hospitalA.doctorUser.email, password: TEST_PASSWORD })
      .expect(201);

    const { deviceId } = loginRes.body.data;
    const originalRefreshCookie = extractRefreshCookie(
      loginRes.headers['set-cookie'] as unknown as string[],
    );

    // Step 2: use that refresh token ONCE — this is legitimate, expected
    // to succeed and hand back a brand new refresh token.
    const firstRefreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', originalRefreshCookie)
      .send({ deviceId })
      .expect(201);

    const newRefreshCookie = extractRefreshCookie(
      firstRefreshRes.headers['set-cookie'] as unknown as string[],
    );

    expect(firstRefreshRes.body.data.accessToken).toBeDefined();

    // Step 3: try to reuse the SAME original token again — simulating a
    // stolen/replayed token. This must be rejected, even though it was
    // a perfectly valid token just one step ago.
    const reuseRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', originalRefreshCookie)
      .send({ deviceId })
      .expect(401);

    expect(reuseRes.body.success).toBe(false);
  });
});
