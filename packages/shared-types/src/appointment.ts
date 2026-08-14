export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  EMERGENCY = 'EMERGENCY',
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  hospitalId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  isEmergency: boolean;
  createdAt: string;
}

export interface AppointmentWithDetails extends Appointment {
  doctor: {
    user: { firstName: string; lastName: string | null };
  };
  department: { name: string };
  hospital: { name: string };
}

export interface CreateAppointmentRequest {
  doctorId: string;
  departmentId: string;
  hospitalId: string;
  scheduledAt: string;
  isEmergency?: boolean;
  patientId?: string;
}

export interface AvailabilitySlot {
  time: string;
  scheduledAt: string;
  available: boolean;
}

export interface AvailabilityResponse {
  doctorId: string;
  date: string;
  slots: AvailabilitySlot[];
}
export interface AppointmentWithPatientDetails extends Appointment {
  patient: {
    user: { firstName: string; lastName: string | null };
  };
  department: { name: string };
  hospital: { name: string };
}