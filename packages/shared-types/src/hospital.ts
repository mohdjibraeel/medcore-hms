export interface Hospital {
  id: string;
  name: string;
  slug: string;
  status: string;
  addressId: string | null;
  createdAt: string;
}

export interface HospitalStats {
  patientsToday: number;
  revenueToday: number;
  doctorCount: number;
  appointmentVolume: { date: string; count: number }[];
  departmentCounts: { departmentName: string; appointmentCount: number }[];
  lowStockMedicines: { name: string; totalStock: number; reorderLevel: number }[];
}
