import { Role } from '@medcore/shared-types';

export const ROLE_DASHBOARD_ROUTES: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/dashboard',
  [Role.HOSPITAL_ADMIN]: '/dashboard/admin',
  [Role.DOCTOR]: '/dashboard/doctor',
  [Role.NURSE]: '/dashboard',
  [Role.RECEPTIONIST]: '/dashboard/receptionist',
  [Role.LAB_TECHNICIAN]: '/dashboard',
  [Role.PHARMACIST]: '/dashboard/pharmacist',
  [Role.ACCOUNTANT]: '/dashboard',
  [Role.PATIENT]: '/dashboard/patient',
};