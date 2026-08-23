import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import type { ForgotPasswordRequest, LoginRequest, LoginResponse, MessageResponse, RefreshResponse, RegisterRequest, ResetPasswordRequest, User } from '@medcore/shared-types';

export async function register(payload: RegisterRequest) {
  await apiClient.post('/auth/register', payload);
}

export async function login(credentials: LoginRequest) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);

  const { data: user } = await apiClient.get<User>('/auth/me', {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });

  useAuthStore.getState().setSession({
    user,
    accessToken: data.accessToken,
    deviceId: data.deviceId,
    // no refreshToken — it lives in the httpOnly cookie now, never in JS
  });

  return user;
}

export async function logout() {
  const { deviceId } = useAuthStore.getState();
  if (deviceId) {
    try {
      await apiClient.post('/auth/logout', { deviceId }); // no refreshToken in the body
    } catch {
      // Already invalid/expired on the backend — fine, we clear local state regardless.
    }
  }
  useAuthStore.getState().clearSession();
}

export async function trySilentLogin() {
  const { deviceId } = useAuthStore.getState();

  if (!deviceId) {
    useAuthStore.getState().setHydrated(true);
    return;
  }

  try {
    // No refreshToken to check for anymore — the browser either has the
    // httpOnly cookie or it doesn't. We just try, and let the backend say no.
    const { data } = await apiClient.post<RefreshResponse>(
      '/auth/refresh',
      { deviceId },
      { _isRefreshRequest: true } as any,
    );

    const { data: user } = await apiClient.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });

    useAuthStore.getState().setSession({
      user,
      accessToken: data.accessToken,
      deviceId,
    });
  } catch {
    useAuthStore.getState().clearSession();
  } finally {
    useAuthStore.getState().setHydrated(true);
  }
  
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
  const { data } = await apiClient.post<MessageResponse>('/auth/forgot-password', payload);
  return data;
}

export async function resetPassword(payload: ResetPasswordRequest) {
  const { data } = await apiClient.post<MessageResponse>('/auth/reset-password', payload);
  return data;
}