import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@medcore/shared-types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  isHydrated: boolean;
  setSession: (params: {
    user: User;
    accessToken: string;
    refreshToken: string;
    deviceId: string;
  }) => void;
  setAccessToken: (accessToken: string) => void;
  setHydrated: (value: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      isHydrated: false,
      setSession: ({ user, accessToken, refreshToken, deviceId }) =>
        set({ user, accessToken, refreshToken, deviceId }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setHydrated: (value) => set({ isHydrated: value }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null, deviceId: null }),
    }),
    {
      name: 'medcore-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        deviceId: state.deviceId,
      }),
    },
  ),
);