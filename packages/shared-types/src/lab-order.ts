export enum LabOrderStatus {
  ORDERED = 'ORDERED',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  RESULT_UPLOADED = 'RESULT_UPLOADED',
  APPROVED = 'APPROVED',
}

export interface LabOrderQueueItem {
  id: string;
  status: LabOrderStatus;
  createdAt: string;
  patientName: string;
  items: {
    id: string;
    testName: string;
    unit: string;
    refRangeLow: number | null;
    refRangeHigh: number | null;
    resultValue: number | null;
    isFlagged: boolean;
  }[];
}

export interface CreateLabOrderRequest {
  medicalRecordId: string;
  items: { labTestId: string }[];
}

export interface LabOrderDetail {
  id: string;
  status: LabOrderStatus;
  createdAt: string;
  items: {
    id: string;
    labTestId: string;
    testName: string;
    unit: string;
    refRangeLow: number | null;
    refRangeHigh: number | null;
    resultValue: number | null;
    isFlagged: boolean;
  }[];
}

export interface LabTest {
  id: string;
  name: string;
  unit: string;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  price: number;
  hospitalId: string;
}

export interface CreateLabTestRequest {
  name: string;
  unit: string;
  refRangeLow?: number;
  refRangeHigh?: number;
  price: number;
}