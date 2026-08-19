'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMedicines, useCreateMedicineBatch } from '@/services/pharmacy.service';
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/api-client';

export default function AddBatchPage() {
  const hospitalId = useAuthStore((s) => s.user?.hospitalId) ?? null;
  const { data: medicines, isLoading: medicinesLoading } = useMedicines(hospitalId);
  const createBatch = useCreateMedicineBatch();

  const [medicineId, setMedicineId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [mrp, setMrp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isValid =
    medicineId && batchNumber.trim() && manufactureDate && expiryDate && quantity && unitCost && mrp;

  const selectedMedicine = medicines?.find((m) => m.id === medicineId);
  const currentStock = selectedMedicine?.batches.reduce((sum, b) => sum + b.quantity, 0) ?? 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError(null);
    setSuccess(null);
    try {
      await createBatch.mutateAsync({
        medicineId,
        batchNumber: batchNumber.trim(),
        manufactureDate,
        expiryDate,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        mrp: Number(mrp),
      });
      setSuccess(`Added ${quantity} unit(s) to ${selectedMedicine?.name}.`);
      setBatchNumber('');
      setManufactureDate('');
      setExpiryDate('');
      setQuantity('');
      setUnitCost('');
      setMrp('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-md">
      <h1 className="text-lg font-semibold text-zinc-900">Add Stock Batch</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Record a new batch of stock for a medicine already in your hospital&apos;s inventory.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <Label>Medicine</Label>
          <Select value={medicineId} onValueChange={setMedicineId}>
            <SelectTrigger>
              <SelectValue placeholder={medicinesLoading ? 'Loading...' : 'Select a medicine'} />
            </SelectTrigger>
            <SelectContent>
              {medicines?.map((med) => (
                <SelectItem key={med.id} value={med.id}>{med.name} ({med.form})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMedicine && (
            <p className="mt-1 text-xs text-zinc-500">Current stock: {currentStock} unit(s)</p>
          )}
          {medicines?.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No medicines exist yet — add one first.
            </p>
          )}
        </div>

        <div>
          <Label>Batch Number</Label>
          <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Manufacture Date</Label>
            <Input type="date" max={today} value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Expiry Date</Label>
            <Input type="date" min={today} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Quantity</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Unit Cost (₹)</Label>
            <Input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>MRP (₹)</Label>
            <Input type="number" min={0} step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} className="mt-1" />
          </div>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

        <Button className="w-full" disabled={!isValid || createBatch.isPending} onClick={handleSubmit}>
          {createBatch.isPending ? 'Adding...' : 'Add Batch'}
        </Button>
      </div>
    </div>
  );
}