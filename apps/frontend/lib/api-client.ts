import axios, { AxiosError } from 'axios';
import type { ApiSuccessResponse, ApiErrorResponse } from '@medcore/shared-types';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Unwrap the { success, data, message } envelope automatically,
// so every calling function just gets the real data directly.
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiSuccessResponse<unknown>;
    return { ...response, data: body.data };
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const backendError = error.response?.data?.error;
    if (backendError) {
      return Promise.reject(
        new ApiError(backendError.code, backendError.message, error.response?.status ?? 500),
      );
    }
    // Network failure, backend down, timeout, etc. — no structured error body to read
    return Promise.reject(
      new ApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.', 0),
    );
  },
);