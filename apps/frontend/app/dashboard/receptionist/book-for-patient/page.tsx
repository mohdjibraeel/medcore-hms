'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePatientSearch } from '@/services/patients.service';
import { useHospitals } from '@/services/hospitals.service';
import { useDoctors } from '@/services/doctors.service';
import { useAvailability, useCreateAppointment } from '@/services/appointments.service';
import { ApiError } from '@/lib/api-client';
import type { Doctor, PatientSearchResult } from '@medcore/shared-types';
import { Label } from '@/components/ui/label';

export default function BookForPatientPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

  const [hospitalId, setHospitalId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; scheduledAt: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: patients, isLoading: patientsLoading } = usePatientSearch(searchTerm);
  const { data: hospitals, isLoading: hospitalsLoading } = useHospitals();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors(hospitalId || null);
  const { data: availability, isLoading: availabilityLoading } = useAvailability(doctorId || null, date || null);
  const createAppointment = useCreateAppointment();

  const selectedDoctor: Doctor | undefined = doctors?.find((d) => d.id === doctorId);
  const today = new Date().toISOString().split('T')[0];

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedSlot || !selectedPatient) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createAppointment.mutateAsync({
        doctorId: selectedDoctor.id,
        departmentId: selectedDoctor.departmentId,
        hospitalId,
        scheduledAt: selectedSlot.scheduledAt,
        patientId: selectedPatient.id,
      });
      setSuccessMessage(
        `Booked ${selectedPatient.firstName} for ${selectedSlot.time} on ${date}.`,
      );
      setSelectedSlot(null);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-zinc-900">Book Appointment for a Patient</h1>

      {!selectedPatient ? (
        <div className="mt-6">
          <Label>Search Patient</Label>
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
          <div className="mt-3 space-y-2">
            {patientsLoading && <p className="text-sm text-zinc-500">Loading...</p>}
            {patients?.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPatient(p)}
                className="block w-full rounded-md border border-zinc-200 bg-white p-3 text-left text-sm hover:bg-zinc-50"
              >
                <div className="font-medium text-zinc-900">
                  {p.firstName} {p.lastName ?? ''}
                </div>
                <div className="text-zinc-500">{p.email}</div>
              </button>
            ))}
            {patients?.length === 0 && (
              <p className="text-sm text-zinc-500">No matching patients found.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 text-sm">
            <span>
              Booking for <strong>{selectedPatient.firstName} {selectedPatient.lastName ?? ''}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedPatient(null)}
              className="text-zinc-500 underline"
            >
              Change
            </button>
          </div>

          <div>
            <Label>Hospital</Label>
            <Select value={hospitalId} onValueChange={(v) => { setHospitalId(v); setDoctorId(''); setSelectedSlot(null); }}>
              <SelectTrigger>
                <SelectValue placeholder={hospitalsLoading ? 'Loading...' : 'Select a hospital'} />
              </SelectTrigger>
              <SelectContent>
                {hospitals?.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Doctor</Label>
            <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setSelectedSlot(null); }} disabled={!hospitalId}>
              <SelectTrigger>
                <SelectValue placeholder={!hospitalId ? 'Select a hospital first' : doctorsLoading ? 'Loading...' : 'Select a doctor'} />
              </SelectTrigger>
              <SelectContent>
                {doctors?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.user.firstName} {d.user.lastName ?? ''} — {d.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date</Label>
            <input
              type="date"
              min={today}
              value={date}
              disabled={!doctorId}
              onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
          </div>

          {doctorId && date && (
            <div>
              <Label>Available Times</Label>
              {availabilityLoading && <p className="text-sm text-zinc-500">Loading slots...</p>}
              {availability && (
                <div className="grid grid-cols-4 gap-2">
                  {availability.slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot({ time: slot.time, scheduledAt: slot.scheduledAt })}
                      className={`rounded-md border px-2 py-2 text-sm ${
                        !slot.available
                          ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400'
                          : selectedSlot?.time === slot.time
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>}
          {successMessage && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>}

          <Button
            type="button"
            disabled={!selectedSlot || createAppointment.isPending}
            onClick={handleConfirm}
            className="w-full"
          >
            {createAppointment.isPending ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </div>
      )}
    </div>
  );
}