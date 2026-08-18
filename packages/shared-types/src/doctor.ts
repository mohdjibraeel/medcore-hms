export interface Doctor {
  id: string;
  userId: string;
  specialization: string;
  licenseNumber: string;
  departmentId: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string | null;
    email: string;
  };
  department: {
    name: string;
  };
  
}

export interface CreateDoctorRequest {
  email: string;
  password: string;
  hospitalId: string;
  specialization: string;
  licenseNumber: string;
  departmentId: string;
  firstName: string;
  lastName?: string;
}