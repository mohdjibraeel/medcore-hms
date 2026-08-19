import { Frequency } from './pharmacy';

export interface CreatePrescriptionItemInput {
  medicineId: string;
  dosage: string;
  dosageUnit: string;
  frequency: Frequency;
  durationDays: number;
  quantity: number;
  instructions?: string;
}

export interface CreatePrescriptionRequest {
  medicalRecordId: string;
  notes?: string;
  items: CreatePrescriptionItemInput[];
}

export interface PrescriptionItem {
  id: string;
  medicineId: string;
  dosage: string;
  dosageUnit: string;
  frequency: Frequency;
  durationDays: number;
  quantity: number;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  medicalRecordId: string;
  doctorId: string;
  patientId: string;
  notes: string | null;
  createdAt: string;
  items: PrescriptionItem[];
}