export interface CreateMedicalRecordRequest {
  appointmentId: string;
  chiefComplaint: string;
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  heightCm?: number;
  weightKg?: number;
  diagnosis?: string;
  treatmentPlan?: string;
  allergies?: string;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  chiefComplaint: string;
  bloodPressure: string | null;
  pulse: number | null;
  temperature: number | null;
  spo2: number | null;
  heightCm: number | null;
  weightKg: number | null;
  diagnosis: string | null;
  treatmentPlan: string | null;
  allergies: string | null;
  createdAt: string;
}