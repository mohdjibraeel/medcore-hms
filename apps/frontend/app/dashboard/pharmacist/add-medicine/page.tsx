'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMedicine } from '@/services/pharmacy.service';
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/api-client';
import { MedicineForm } from '@medcore/shared-types';

export default function AddMedicinePage() {
  const hospitalId = useAuthStore((s) => s.user?.hospitalId) ?? null;
  const createMedicine = useCreateMedicine();

  const [name, setName] = useState('');
  const [form, setForm] = useState<MedicineForm | ''>('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isValid = name.trim() && form;

  const handleSubmit = async () => {
    if (!isValid || !hospitalId) return;
    setError(null);
    setSuccess(null);
    try {
      const created = await createMedicine.mutateAsync({
        name: name.trim(),
        form: form as MedicineForm,
        hospitalId,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      });
      setSuccess(`"${created.name}" added to inventory.`);
      setName('');
      setForm('');
      setReorderLevel('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  if (!hospitalId) {
    return <p className="text-sm text-red-600">Your account isn&apos;t assigned to a hospital.</p>;
  }

  return (
    <div className="max-w-md">
      <h1 className="text-lg font-semibold text-zinc-900">Add Medicine</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Add a medicine to your hospital&apos;s inventory. You can add stock batches for it afterward.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Form</Label>
          <Select value={form} onValueChange={(v) => setForm(v as MedicineForm)}>
            <SelectTrigger><SelectValue placeholder="Select a form" /></SelectTrigger>
            <SelectContent>
              {Object.values(MedicineForm).map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Reorder Level (optional)</Label>
          <Input type="number" min={0} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="mt-1" />
          <p className="mt-1 text-xs text-zinc-500">Defaults to 10 if left blank.</p>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

        <Button className="w-full" disabled={!isValid || createMedicine.isPending} onClick={handleSubmit}>
          {createMedicine.isPending ? 'Adding...' : 'Add Medicine'}
        </Button>
      </div>
    </div>
  );
}