'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useHospitals } from '@/services/hospitals.service';
import { useDoctors } from '@/services/doctors.service';
import { useAvailability, useCreateAppointment } from '@/services/appointments.service';
import { ApiError } from '@/lib/api-client';
import type { Doctor } from '@medcore/shared-types';

export default function BookAppointmentPage() {
  const [hospitalId, setHospitalId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; scheduledAt: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: hospitals, isLoading: hospitalsLoading } = useHospitals();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors(hospitalId || null);
  const { data: availability, isLoading: availabilityLoading } = useAvailability(doctorId || null, date || null);
  const createAppointment = useCreateAppointment();

  const selectedDoctor: Doctor | undefined = doctors?.find((d) => d.id === doctorId);
  const today = new Date().toISOString().split('T')[0];

  const handleHospitalChange = (value: string) => {
    setHospitalId(value);
    setDoctorId('');
    setSelectedSlot(null);
  };

  const handleDoctorChange = (value: string) => {
    setDoctorId(value);
    setSelectedSlot(null);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setSelectedSlot(null);
  };

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createAppointment.mutateAsync({
        doctorId: selectedDoctor.id,
        departmentId: selectedDoctor.departmentId,
        hospitalId,
        scheduledAt: selectedSlot.scheduledAt,
      });
      setSuccessMessage(`Appointment booked for ${selectedSlot.time} on ${date}.`);
      setSelectedSlot(null);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-zinc-900">Book an Appointment</h1>
      <p className="mt-1 text-sm text-zinc-500">Pick a hospital, a doctor, and an open time slot.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Hospital</label>
          <Select value={hospitalId} onValueChange={handleHospitalChange}>
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
          <label className="mb-1 block text-sm font-medium text-zinc-700">Doctor</label>
          <Select value={doctorId} onValueChange={handleDoctorChange} disabled={!hospitalId}>
            <SelectTrigger>
              <SelectValue
                placeholder={!hospitalId ? 'Select a hospital first' : doctorsLoading ? 'Loading...' : 'Select a doctor'}
              />
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
          <label className="mb-1 block text-sm font-medium text-zinc-700">Date</label>
          <input
            type="date"
            min={today}
            value={date}
            disabled={!doctorId}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
          />
        </div>

        {doctorId && date && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Available Times</label>
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
    </div>
  );
}