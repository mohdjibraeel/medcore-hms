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