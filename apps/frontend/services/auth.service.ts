import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import type { LoginRequest, LoginResponse, RefreshResponse, RegisterRequest, User } from '@medcore/shared-types';

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
    refreshToken: data.refreshToken,
    deviceId: data.deviceId,
  });

  return user;
}

export async function logout() {
  const { refreshToken, deviceId } = useAuthStore.getState();
  if (refreshToken && deviceId) {
    try {
      await apiClient.post('/auth/logout', { refreshToken, deviceId });
    } catch {
      // Already invalid/expired on the backend — fine, we clear local state regardless.
    }
  }
  useAuthStore.getState().clearSession();
}

export async function trySilentLogin() {
  const { refreshToken, deviceId } = useAuthStore.getState();

  if (!refreshToken || !deviceId) {
    useAuthStore.getState().setHydrated(true);
    return;
  }

  try {
    const { data } = await apiClient.post<RefreshResponse>(
      '/auth/refresh',
      { refreshToken, deviceId },
      { _isRefreshRequest: true } as any,
    );

    const { data: user } = await apiClient.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });

    useAuthStore.getState().setSession({
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      deviceId,
    });
  } catch {
    useAuthStore.getState().clearSession();
  } finally {
    useAuthStore.getState().setHydrated(true);
  }
}