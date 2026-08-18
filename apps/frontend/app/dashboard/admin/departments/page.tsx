'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDepartments, useCreateDepartment } from '@/services/departments.service';
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/api-client';

export default function DepartmentsPage() {
  const user = useAuthStore((state) => state.user);
  const hospitalId = user?.hospitalId ?? null;

  const { data: departments, isLoading } = useDepartments(hospitalId);
  const createDepartment = useCreateDepartment();

  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isValid = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!isValid || !hospitalId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await createDepartment.mutateAsync({ name: name.trim(), hospitalId });
      setSuccessMessage(`"${created.name}" department created.`);
      setName('');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  if (!hospitalId) {
    return (
      <p className="text-sm text-red-600">
        Your account isn&apos;t assigned to a hospital, so you can&apos;t manage departments.
      </p>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-zinc-900">Departments</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Create and view the departments at your hospital. Doctors are assigned to a department when registered.
      </p>

      <div className="mt-6 space-y-3">
        <Label>New Department Name</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Cardiology"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="button" disabled={!isValid || createDepartment.isPending} onClick={handleSubmit}>
            {createDepartment.isPending ? 'Adding...' : 'Add'}
          </Button>
        </div>
        {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>}
        {successMessage && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-700">
          Existing Departments {departments && <span className="text-zinc-400">({departments.length})</span>}
        </h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading...</p>
        ) : departments?.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">No departments yet — add one above.</p>
        ) : (
          <div className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
            {departments?.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-zinc-900">{dept.name}</span>
                <span className="text-xs text-zinc-400">
                  Added {new Date(dept.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}