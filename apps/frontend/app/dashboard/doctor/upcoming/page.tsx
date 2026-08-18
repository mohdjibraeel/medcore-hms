'use client';

import { useMyAppointments } from '@/services/appointments.service';
import type { AppointmentWithPatientDetails } from '@medcore/shared-types';
import { AppointmentCard } from '@/components/doctor/appointment-card';

function getISTDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

export default function UpcomingAppointmentsPage() {
  const { data: appointments, isLoading, isError } = useMyAppointments<AppointmentWithPatientDetails>();

  const todayIST = getISTDateString(new Date());
  const upcoming = (appointments ?? [])
    .filter((appt) => getISTDateString(new Date(appt.scheduledAt)) > todayIST)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const grouped = upcoming.reduce<Record<string, AppointmentWithPatientDetails[]>>((acc, appt) => {
    const key = getISTDateString(new Date(appt.scheduledAt));
    (acc[key] ??= []).push(appt);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">Upcoming Appointments</h1>
      <p className="mt-1 text-sm text-zinc-500">Appointments scheduled after today.</p>

      <div className="mt-6 space-y-8">
        {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
        {isError && <p className="text-sm text-red-600">Couldn&apos;t load your appointments.</p>}
        {!isLoading && upcoming.length === 0 && (
          <p className="text-sm text-zinc-500">No upcoming appointments.</p>
        )}

        {Object.entries(grouped).map(([date, appts]) => (
          <div key={date}>
            <h2 className="text-sm font-semibold text-zinc-700">
              {new Date(date).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            <div className="mt-3 space-y-3">
              {appts.map((appt) => (
                <AppointmentCard key={appt.id} appt={appt} showActions={false} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}