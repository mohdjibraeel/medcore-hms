'use client';

import { useEffect } from 'react';
import { trySilentLogin } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    trySilentLogin();
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}