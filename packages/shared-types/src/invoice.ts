export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID',
}

export enum InvoiceItemCategory {
  CONSULTATION = 'CONSULTATION',
  LAB = 'LAB',
  PHARMACY = 'PHARMACY',
  ROOM = 'ROOM',
  OTHER = 'OTHER',
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  category: InvoiceItemCategory;
  amount: number;
}

export interface Invoice {
  id: string;
  appointmentId: string;
  patientId: string;
  hospitalId: string;
  status: InvoiceStatus;
  totalAmount: number;
  razorpayOrderId: string | null;
  createdAt: string;
  items?: InvoiceItem[];
}

export interface AppointmentForPatient {
  id: string;
  scheduledAt: string;
  status: string;
  doctor: { user: { firstName: string; lastName: string | null } };
  department: { name: string };
  hospital: { name: string };
}