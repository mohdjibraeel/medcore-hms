export interface HospitalAdmin {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  status: string;
  addressId: string | null;
  createdAt: string;
  admin: HospitalAdmin | null;
}

export interface HospitalStats {
  patientsToday: number;
  revenueToday: number;
  doctorCount: number;
  appointmentVolume: { date: string; count: number }[];
  departmentCounts: { departmentName: string; appointmentCount: number }[];
  lowStockMedicines: { name: string; totalStock: number; reorderLevel: number }[];
}

export interface PlatformStats {
  totalHospitals: number;
  hospitalsByStatus: { PENDING: number; VERIFIED: number; REJECTED: number };
  totalDoctors: number;
  totalPatients: number;
  totalRevenue: number;
}