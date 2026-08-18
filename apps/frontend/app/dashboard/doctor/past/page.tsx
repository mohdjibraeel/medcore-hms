'use client';

import { useMyAppointments } from '@/services/appointments.service';
import { AppointmentStatus, type AppointmentWithPatientDetails } from '@medcore/shared-types';
import { AppointmentCard } from '@/components/doctor/appointment-card';

function getISTDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

const GROUP_ORDER: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.CANCELLED,
];

const GROUP_LABELS: Record<string, string> = {
  [AppointmentStatus.COMPLETED]: 'Completed',
  [AppointmentStatus.NO_SHOW]: 'No-show',
  [AppointmentStatus.CANCELLED]: 'Cancelled',
};

export default function PastAppointmentsPage() {
  const { data: appointments, isLoading, isError } = useMyAppointments<AppointmentWithPatientDetails>();

  const todayIST = getISTDateString(new Date());
  const past = (appointments ?? [])
    .filter((appt) => getISTDateString(new Date(appt.scheduledAt)) < todayIST)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const grouped = GROUP_ORDER.reduce<Record<string, AppointmentWithPatientDetails[]>>((acc, status) => {
    acc[status] = past.filter((appt) => appt.status === status);
    return acc;
  }, {});

  // Anything past-dated that never got marked complete/cancelled/no-show
  // (e.g. still PENDING or CONFIRMED) — surface it separately so it doesn't
  // silently vanish from view.
  const unresolved = past.filter((appt) => !GROUP_ORDER.includes(appt.status));

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">Past Appointments</h1>
      <p className="mt-1 text-sm text-zinc-500">Grouped by outcome.</p>

      <div className="mt-6 space-y-8">
        {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
        {isError && <p className="text-sm text-red-600">Couldn&apos;t load your appointments.</p>}
        {!isLoading && past.length === 0 && (
          <p className="text-sm text-zinc-500">No past appointments yet.</p>
        )}

        {GROUP_ORDER.map((status) =>
          grouped[status].length > 0 ? (
            <div key={status}>
              <h2 className="text-sm font-semibold text-zinc-700">
                {GROUP_LABELS[status]} <span className="text-zinc-400">({grouped[status].length})</span>
              </h2>
              <div className="mt-3 space-y-3">
                {grouped[status].map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} showActions={false} showDate />
                ))}
              </div>
            </div>
          ) : null,
        )}

        {unresolved.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-amber-700">
              Needs Follow-up <span className="text-amber-500">({unresolved.length})</span>
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              These are in the past but were never marked completed, cancelled, or no-show.
            </p>
            <div className="mt-3 space-y-3">
              {unresolved.map((appt) => (
                <AppointmentCard key={appt.id} appt={appt} showActions showDate />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}