# MedCore HMS — Demo Credentials

All accounts below were created by `apps/backend/prisma/seed-demo.ts`.
Password for every seeded account is **`Demo@123`**, except the original Super Admin account.

Primary demo hospital: **Apollo Care Multispecialty Hospital** (all staff/doctor logins below belong to this hospital unless noted).
A second hospital, **Metro Health Institute**, also exists with its own full staff/doctor set (same role emails, `.metro` suffix instead of `.apollo`) — useful for demonstrating multi-tenancy isolation live.

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@medcore.com | SuperAdmin@123 |
| Hospital Admin | hospitaladmin.apollo@medcore.demo | Demo@123 |
| Doctor (Cardiology) | dr.soledad.cardiology@medcore.demo | Demo@123 |
| Doctor (Orthopedics) | dr.tami.orthopedics@medcore.demo | Demo@123 |
| Doctor (Pediatrics) | dr.hector.pediatrics@medcore.demo | Demo@123 |
| Doctor (General Medicine) | dr.kenya.generalmedicine@medcore.demo | Demo@123 |
| Nurse | nurse.apollo@medcore.demo | Demo@123 |
| Receptionist | receptionist.apollo@medcore.demo | Demo@123 |
| Lab Technician | labtech.apollo@medcore.demo | Demo@123 |
| Pharmacist | pharmacist.apollo@medcore.demo | Demo@123 |
| Accountant | accountant.apollo@medcore.demo | Demo@123 |
| Patient | leta.dach99@medcore.demo | Demo@123 |

## Notes for reviewers
- Appointment history spans the last ~2 weeks plus a few upcoming days, across both hospitals.
- A subset of completed appointments include full clinical records: medical record → prescription → pharmacy dispensing queue, and/or lab order with results (some intentionally flagged out-of-range).
- Most completed visits also have an invoice (mix of `FINALIZED` and `PAID`), populating the Accountant's reconciliation view.
- To reseed from scratch: `npx ts-node prisma/seed-demo.ts --reset` (run from `apps/backend`). This only resets demo data — it does not touch the original `admin@medcore.com` account or any other manually-created data.
