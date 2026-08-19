export enum MedicineForm {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  SYRUP = 'SYRUP',
  INJECTION = 'INJECTION',
  TOPICAL = 'TOPICAL',
}

export enum Frequency {
  OD = 'OD',
  BD = 'BD',
  TDS = 'TDS',
  QID = 'QID',
  SOS = 'SOS',
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  mrp: number;
  isQuarantined: boolean;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  form: MedicineForm;
  hospitalId: string;
  reorderLevel: number;
  createdAt: string;
  batches: MedicineBatch[];
}

export interface PendingPrescriptionItem {
  id: string;
  medicineName: string;
  medicineForm: MedicineForm;
  dosage: string;
  dosageUnit: string;
  frequency: Frequency;
  durationDays: number;
  quantity: number;
  remaining: number;
  patientName: string;
  doctorName: string;
}

export interface DispenseMedicineRequest {
  prescriptionItemId: string;
  quantity: number;
}

export interface CreateMedicineRequest {
  name: string;
  form: MedicineForm;
  hospitalId: string;
  reorderLevel?: number;
}

export interface CreateMedicineBatchRequest {
  medicineId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  mrp: number;
}