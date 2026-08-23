export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  dateOfBirth: string; // ISO date string, e.g. "1990-01-15"
  firstName: string;
  lastName?: string;
}

export interface RefreshRequest {
  deviceId: string;
}

export interface LoginResponse {
  accessToken: string;
  deviceId: string;
}

export interface RefreshResponse {
  accessToken: string;
}