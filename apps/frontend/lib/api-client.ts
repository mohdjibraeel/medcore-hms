import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiSuccessResponse, ApiErrorResponse } from '@medcore/shared-types';
import { useAuthStore } from '@/store/authStore';

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
  withCredentials: true, // required so the httpOnly refresh cookie is sent automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiSuccessResponse<unknown>;
    return { ...response, data: body.data };
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _isRefreshRequest?: boolean })
      | undefined;

    const isExpiredToken =
      error.response?.status === 401 && !originalRequest?._isRefreshRequest;

    if (isExpiredToken && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const { deviceId, setAccessToken, clearSession } = useAuthStore.getState();

      if (deviceId) {
        try {
          const { data } = await apiClient.post(
            '/auth/refresh',
            { deviceId }, // no refreshToken here — the httpOnly cookie carries it automatically
            { _isRefreshRequest: true } as any,
          );
          setAccessToken(data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(originalRequest);
        } catch {
          clearSession();
        }
      } else {
        clearSession();
      }
    }

    const backendError = error.response?.data?.error;
    if (backendError) {
      return Promise.reject(
        new ApiError(backendError.code, backendError.message, error.response?.status ?? 500),
      );
    }
    return Promise.reject(
      new ApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.', 0),
    );
  },
);