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
  createdAt: string;
}