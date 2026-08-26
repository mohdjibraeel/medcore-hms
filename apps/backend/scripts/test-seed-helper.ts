import { seedTwoHospitals, cleanupDatabase, testPrisma } from '../test/helpers/seed.helper';

async function main() {
  await cleanupDatabase();
  const { hospitalA, hospitalB } = await seedTwoHospitals();

  console.log('Hospital A:', hospitalA.hospital.name, '| Doctor:', hospitalA.doctorUser.email, '| Patient:', hospitalA.patientUser.email);
  console.log('Hospital B:', hospitalB.hospital.name, '| Doctor:', hospitalB.doctorUser.email, '| Patient:', hospitalB.patientUser.email);
  console.log('Doctor A token (first 20 chars):', hospitalA.doctorToken.slice(0, 20));

  await cleanupDatabase();
}

main()
  .catch((err) => console.error('SEED TEST FAILED:', err))
  .finally(() => testPrisma.$disconnect());