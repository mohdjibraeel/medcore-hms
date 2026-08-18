'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateStaff } from '@/services/staff.service';
import { ApiError } from '@/lib/api-client';
import type { RegisterableStaffRole } from '@medcore/shared-types';

const ROLE_OPTIONS: { value: RegisterableStaffRole; label: string }[] = [
  { value: 'NURSE', label: 'Nurse' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
];

export default function RegisterStaffPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RegisterableStaffRole | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createStaff = useCreateStaff();

  const isValid = firstName.trim() && email.trim() && password.length >= 6 && role;

  const handleSubmit = async () => {
    if (!isValid || !role) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await createStaff.mutateAsync({
        firstName,
        lastName: lastName.trim() || undefined,
        email,
        password,
        role,
      });
      setSuccessMessage(`${created.firstName} was registered as ${created.role.replace('_', ' ')}.`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole('');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-zinc-900">Register Staff</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Add a Nurse, Receptionist, Lab Technician, Pharmacist, or Accountant to your hospital.
      </p>

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
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-zinc-500">At least 6 characters. Share this with the staff member directly.</p>
        </div>

        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as RegisterableStaffRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>}
        {successMessage && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>}

        <Button
          type="button"
          disabled={!isValid || createStaff.isPending}
          onClick={handleSubmit}
          className="w-full"
        >
          {createStaff.isPending ? 'Registering...' : 'Register Staff Member'}
        </Button>
      </div>
    </div>
  );
}