import { Role } from '@medcore/shared-types';

export const ROLE_DASHBOARD_ROUTES: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/dashboard',
  [Role.HOSPITAL_ADMIN]: '/dashboard',
  [Role.DOCTOR]: '/dashboard',
  [Role.NURSE]: '/dashboard',
  [Role.RECEPTIONIST]: '/dashboard',
  [Role.LAB_TECHNICIAN]: '/dashboard',
  [Role.PHARMACIST]: '/dashboard',
  [Role.ACCOUNTANT]: '/dashboard',
  [Role.PATIENT]: '/dashboard/patient',
};