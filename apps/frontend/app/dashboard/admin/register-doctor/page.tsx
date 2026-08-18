'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateDoctor } from '@/services/doctors.service';
import { useDepartments } from '@/services/departments.service';
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/api-client';

export default function RegisterDoctorPage() {
  const user = useAuthStore((state) => state.user);
  const hospitalId = user?.hospitalId ?? null;

  const { data: departments, isLoading: departmentsLoading } = useDepartments(hospitalId);
  const createDoctor = useCreateDoctor();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isValid =
    firstName.trim() &&
    email.trim() &&
    password.length >= 6 &&
    specialization.trim() &&
    licenseNumber.trim() &&
    departmentId;

  const handleSubmit = async () => {
    if (!isValid || !hospitalId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createDoctor.mutateAsync({
        firstName,
        lastName: lastName.trim() || undefined,
        email,
        password,
        hospitalId,
        specialization,
        licenseNumber,
        departmentId,
      });
      setSuccessMessage(`Dr. ${firstName} ${lastName} was registered successfully.`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setSpecialization('');
      setLicenseNumber('');
      setDepartmentId('');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  if (!hospitalId) {
    return (
      <p className="text-sm text-red-600">
        Your account isn&apos;t assigned to a hospital, so you can&apos;t register doctors.
      </p>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-zinc-900">Register Doctor</h1>
      <p className="mt-1 text-sm text-zinc-500">Add a new doctor to your hospital.</p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>First Name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label>Temporary Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          <p className="mt-1 text-xs text-zinc-500">At least 6 characters. Share this with the doctor directly.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Specialization</Label>
            <Input
              placeholder="e.g. Cardiology"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>License Number</Label>
            <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div>
          <Label>Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue placeholder={departmentsLoading ? 'Loading...' : 'Select a department'} />
            </SelectTrigger>
            <SelectContent>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {departments?.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No departments exist yet at your hospital — create one first.
            </p>
          )}
        </div>

        {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>}
        {successMessage && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>}

        <Button type="button" disabled={!isValid || createDoctor.isPending} onClick={handleSubmit} className="w-full">
          {createDoctor.isPending ? 'Registering...' : 'Register Doctor'}
        </Button>
      </div>
    </div>
  );
}