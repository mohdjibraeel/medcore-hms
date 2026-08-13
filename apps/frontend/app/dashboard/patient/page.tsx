'use client';

import { useAuthStore } from '@/store/authStore';

export default function PatientDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900">Welcome back, {user?.firstName}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Appointments, records, and invoices will appear here in upcoming steps.
      </p>
    </div>
  );
}