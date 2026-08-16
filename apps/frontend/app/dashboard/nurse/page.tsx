'use client';

import { useState } from 'react';
import { useTodayAppointments } from '@/services/appointments.service';
import { useCreateMedicalRecord } from '@/services/medical-records.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import type { AppointmentForToday } from '@medcore/shared-types';

function VitalsRow({ appt }: { appt: AppointmentForToday }) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');

  const createRecord = useCreateMedicalRecord();

  const handleSubmit = async () => {
    if (!chiefComplaint) {
      setError('Chief complaint is required (e.g. "Routine vitals check").');
      return;
    }
    setError(null);
    try {
      await createRecord.mutateAsync({
        appointmentId: appt.id,
        chiefComplaint,
        bloodPressure: bloodPressure || undefined,
        pulse: pulse ? Number(pulse) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
        spo2: spo2 ? Number(spo2) : undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-900">
            {appt.patient.user.firstName} {appt.patient.user.lastName ?? ''}
          </div>
          <div className="text-sm text-zinc-500">
            Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName ?? ''} ·{' '}
            {new Date(appt.scheduledAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
          </div>
        </div>
        {!success && (
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Record Vitals'}
          </Button>
        )}
      </div>

      {success && <p className="mt-2 text-sm text-green-700">Vitals recorded.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {open && !success && (
        <div className="mt-3 space-y-2">
          <div className="space-y-1">
            <Label>Chief Complaint *</Label>
            <Input
              placeholder="e.g. Routine vitals check"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="BP (120/80)" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
            <Input type="number" placeholder="Pulse" value={pulse} onChange={(e) => setPulse(e.target.value)} />
            <Input type="number" step="0.1" placeholder="Temp °C" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            <Input type="number" placeholder="SpO2 %" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
          </div>
          <Button size="sm" disabled={createRecord.isPending} onClick={handleSubmit}>
            {createRecord.isPending ? 'Saving...' : 'Save Vitals'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function NurseDashboardPage() {
  const { data: appointments, isLoading, isError } = useTodayAppointments();

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">Today&apos;s Patients</h1>
      <p className="mt-1 text-sm text-zinc-500">Record vitals ahead of the doctor&apos;s visit.</p>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
        {isError && <p className="text-sm text-red-600">Couldn&apos;t load today&apos;s appointments.</p>}
        {appointments?.length === 0 && <p className="text-sm text-zinc-500">No appointments scheduled today.</p>}
        {appointments?.map((appt) => (
          <VitalsRow key={appt.id} appt={appt} />
        ))}
      </div>
    </div>
  );
}