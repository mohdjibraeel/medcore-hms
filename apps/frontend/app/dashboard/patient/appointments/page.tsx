'use client';

import { useMyAppointments } from '@/services/appointments.service';
import { AppointmentStatus, type AppointmentWithDetails } from '@medcore/shared-types';

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'bg-amber-50 text-amber-700',
  [AppointmentStatus.CONFIRMED]: 'bg-blue-50 text-blue-700',
  [AppointmentStatus.IN_PROGRESS]: 'bg-purple-50 text-purple-700',
  [AppointmentStatus.COMPLETED]: 'bg-green-50 text-green-700',
  [AppointmentStatus.CANCELLED]: 'bg-zinc-100 text-zinc-500',
  [AppointmentStatus.NO_SHOW]: 'bg-red-50 text-red-700',
  [AppointmentStatus.EMERGENCY]: 'bg-red-100 text-red-800',
};

function AppointmentCard({ appt }: { appt: AppointmentWithDetails }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <div className="text-sm font-medium text-zinc-900">
          Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName ?? ''}
        </div>
        <div className="text-sm text-zinc-500">
          {appt.department.name} · {appt.hospital.name}
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          {new Date(appt.scheduledAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </div>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[appt.status]}`}>
        {appt.status}
      </span>
    </div>
  );
}

export default function MyAppointmentsPage() {
  const { data: appointments, isLoading, isError } = useMyAppointments();

  const now = new Date();
  // Ascending from the backend already means "soonest first" within each group.
  const upcoming = appointments?.filter((a) => new Date(a.scheduledAt) >= now) ?? [];
  // Past appointments should read most-recent-past first, so we reverse this slice.
  const past = appointments
    ? appointments.filter((a) => new Date(a.scheduledAt) < now).reverse()
    : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">My Appointments</h1>
      <p className="mt-1 text-sm text-zinc-500">Everything you&apos;ve booked.</p>

      {isLoading && <p className="mt-6 text-sm text-zinc-500">Loading...</p>}
      {isError && <p className="mt-6 text-sm text-red-600">Couldn&apos;t load your appointments. Try refreshing.</p>}

      {appointments?.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">You haven&apos;t booked any appointments yet.</p>
      )}

      {upcoming.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700">Past</h2>
          <div className="space-y-3">
            {past.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}