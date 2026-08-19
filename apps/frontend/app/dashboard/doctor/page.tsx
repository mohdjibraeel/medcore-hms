'use client';

import { useMyAppointments, useUpdateAppointmentStatus } from '@/services/appointments.service';
import { AppointmentStatus, type AppointmentWithPatientDetails } from '@medcore/shared-types';
import { ApiError } from '@/lib/api-client';
import { useState } from 'react';
import { AppointmentCard } from '@/components/doctor/appointment-card';

function getISTDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

export default function DoctorDashboardPage() {
  const { data: appointments, isLoading, isError } = useMyAppointments<AppointmentWithPatientDetails>();
  const updateStatus = useUpdateAppointmentStatus();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayIST = getISTDateString(new Date());
  const todaysAppointments = appointments?.filter(
    (appt) => getISTDateString(new Date(appt.scheduledAt)) === todayIST,
  ) ?? [];

    const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    setErrorMessage(null);
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
      throw err;
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">Today&apos;s Appointments</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {errorMessage && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
        {isError && <p className="text-sm text-red-600">Couldn&apos;t load your appointments.</p>}
        {!isLoading && todaysAppointments.length === 0 && (
          <p className="text-sm text-zinc-500">No appointments scheduled for today.</p>
        )}

        {todaysAppointments.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            onStatusChange={handleStatusChange}
            isPending={updateStatus.isPending}
          />
        ))}
      </div>
    </div>
  );
}