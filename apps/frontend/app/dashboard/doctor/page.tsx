'use client';

import { useMyAppointments, useUpdateAppointmentStatus } from '@/services/appointments.service';
import { AppointmentStatus, type AppointmentWithPatientDetails } from '@medcore/shared-types';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { useState } from 'react';
import Link from 'next/dist/client/link';

const NEXT_STATUS: Partial<Record<AppointmentStatus, { label: string; next: AppointmentStatus }[]>> = {
  [AppointmentStatus.PENDING]: [
    { label: 'Confirm', next: AppointmentStatus.CONFIRMED },
    { label: 'Cancel', next: AppointmentStatus.CANCELLED },
  ],
  [AppointmentStatus.CONFIRMED]: [
    { label: 'Start', next: AppointmentStatus.IN_PROGRESS },
    { label: 'No-show', next: AppointmentStatus.NO_SHOW },
    { label: 'Cancel', next: AppointmentStatus.CANCELLED },
  ],
  [AppointmentStatus.IN_PROGRESS]: [
    { label: 'Complete', next: AppointmentStatus.COMPLETED },
  ],
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'bg-amber-50 text-amber-700',
  [AppointmentStatus.CONFIRMED]: 'bg-blue-50 text-blue-700',
  [AppointmentStatus.IN_PROGRESS]: 'bg-purple-50 text-purple-700',
  [AppointmentStatus.COMPLETED]: 'bg-green-50 text-green-700',
  [AppointmentStatus.CANCELLED]: 'bg-zinc-100 text-zinc-500',
  [AppointmentStatus.NO_SHOW]: 'bg-red-50 text-red-700',
  [AppointmentStatus.EMERGENCY]: 'bg-red-100 text-red-800',
};

// Formats a Date as YYYY-MM-DD in the hospital's actual local timezone (IST),
// regardless of what timezone the doctor's own browser happens to be set to.
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
          <div key={appt.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-900">
                  {appt.patient.user.firstName} {appt.patient.user.lastName ?? ''}
                </div>
                <div className="text-sm text-zinc-500">{appt.department.name}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {new Date(appt.scheduledAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[appt.status]}`}>
                {appt.status}
              </span>
              <Link
              href={`/dashboard/doctor/encounter/${appt.id}?patientName=${encodeURIComponent(
                `${appt.patient.user.firstName} ${appt.patient.user.lastName ?? ''}`.trim(),
              )}`}
              className="mt-2 inline-block text-sm text-blue-600 underline"
            >
              Start Encounter
            </Link>
            </div>

            {NEXT_STATUS[appt.status] && (
              <div className="mt-3 flex gap-2">
                {NEXT_STATUS[appt.status]!.map((action) => (
                  <Button
                    key={action.next}
                    size="sm"
                    variant="outline"
                    disabled={updateStatus.isPending}
                    onClick={() => handleStatusChange(appt.id, action.next)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}