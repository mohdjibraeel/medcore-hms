import { Role } from '@medcore/shared-types';

export const ROLE_DASHBOARD_ROUTES: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/dashboard/super-admin',
  [Role.HOSPITAL_ADMIN]: '/dashboard/admin',
  [Role.DOCTOR]: '/dashboard/doctor',
  [Role.NURSE]: '/dashboard',
  [Role.RECEPTIONIST]: '/dashboard/receptionist',
  [Role.LAB_TECHNICIAN]: '/dashboard/lab',
  [Role.PHARMACIST]: '/dashboard/pharmacist',
  [Role.ACCOUNTANT]: '/dashboard/accountant',
  [Role.PATIENT]: '/dashboard/patient',
};