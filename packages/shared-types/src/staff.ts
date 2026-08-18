export type RegisterableStaffRole =
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECHNICIAN'
  | 'PHARMACIST'
  | 'ACCOUNTANT';

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  role: RegisterableStaffRole;
  createdAt: string;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  role: RegisterableStaffRole;
}