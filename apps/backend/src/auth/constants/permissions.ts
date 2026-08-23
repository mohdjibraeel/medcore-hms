import { Role } from '../../../generated/prisma/client';

// Format: "action:resource" — a common, readable convention.
// SUPER_ADMIN gets a single wildcard rather than an exhaustive list — it's
// the one role meant to bypass granular checks entirely, so spelling out
// every permission for it would just be noise to maintain.
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],

  HOSPITAL_ADMIN: [
    'manage:staff',
    'manage:department',
    'view:hospital-analytics',
    'manage:hospital-settings',
    'view:patient-records',
    'view:invoices',
    'manage:invoices',
  ],

  DOCTOR: [
    'view:patient-records',
    'edit:patient-records',
    'create:prescription',
    'create:lab-order',
    'view:lab-results',
    'view:own-appointments',
    'manage:own-appointments',
  ],

  NURSE: [
    'view:patient-records',
    'edit:patient-vitals',
    'view:own-appointments',
    'view:lab-results',
  ],

  RECEPTIONIST: [
    'create:appointment',
    'view:appointments',
    'manage:appointments',
    'view:patient-basic-info',
    'register:patient',
  ],

  LAB_TECHNICIAN: [
    'view:lab-orders',
    'update:lab-results',
    'view:patient-basic-info',
  ],

  PHARMACIST: [
    'view:prescription',
    'dispense:medication',
    'manage:inventory',
  ],

  ACCOUNTANT: [
    'view:invoices',
    'manage:invoices',
    'view:hospital-analytics',
  ],

  PATIENT: [
    'view:own-records',
    'view:own-prescriptions',
    'view:own-appointments',
    'book:appointment',
    'view:own-invoices',
  ],
};

export function getPermissionsForRole(role: Role): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}