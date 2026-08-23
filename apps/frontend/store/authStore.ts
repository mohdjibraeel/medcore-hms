import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@medcore/shared-types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  deviceId: string | null;
  isHydrated: boolean;
  setSession: (params: {
    user: User;
    accessToken: string;
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
      deviceId: null,
      isHydrated: false,
      setSession: ({ user, accessToken, deviceId }) =>
        set({ user, accessToken, deviceId }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setHydrated: (value) => set({ isHydrated: value }),
      clearSession: () =>
        set({ user: null, accessToken: null, deviceId: null }),
    }),
    {
      name: 'medcore-auth',
      partialize: (state) => ({
        deviceId: state.deviceId,
      }),
    },
  ),
);