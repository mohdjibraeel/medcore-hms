'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useCreateMedicalRecord } from '@/services/medical-records.service';
import { useLabTests, useCreateLabOrder } from '@/services/lab-orders.service';
import { useMedicines } from '@/services/pharmacy.service';
import { useCreatePrescription } from '@/services/prescriptions.service';
import { ApiError } from '@/lib/api-client';
import { Frequency } from '@medcore/shared-types';

interface PrescriptionRow {
  medicineId: string;
  dosage: string;
  dosageUnit: string;
  frequency: Frequency | '';
  durationDays: string;
  quantity: string;
  instructions: string;
}

const emptyRow: PrescriptionRow = {
  medicineId: '',
  dosage: '',
  dosageUnit: '',
  frequency: '',
  durationDays: '',
  quantity: '',
  instructions: '',
};

export default function EncounterPage() {
  const params = useParams<{ appointmentId: string }>();
  const searchParams = useSearchParams();
  const patientName = searchParams.get('patientName') ?? 'Patient';
  const hospitalId = useAuthStore((s) => s.user?.hospitalId) ?? null;

  const [medicalRecordId, setMedicalRecordId] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');

  const createRecord = useCreateMedicalRecord();

  const handleCreateRecord = async () => {
    if (!chiefComplaint) return;
    setRecordError(null);
    try {
      const record = await createRecord.mutateAsync({
        appointmentId: params.appointmentId,
        chiefComplaint,
        diagnosis: diagnosis || undefined,
        treatmentPlan: treatmentPlan || undefined,
        bloodPressure: bloodPressure || undefined,
        pulse: pulse ? Number(pulse) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
      });
      setMedicalRecordId(record.id);
    } catch (err) {
      setRecordError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Encounter — {patientName}</h1>
        <p className="mt-1 text-sm text-zinc-500">Record vitals, then order tests or write a prescription.</p>
      </div>

      {!medicalRecordId ? (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Medical Record</h2>
          {recordError && <p className="text-sm text-red-600">{recordError}</p>}

          <div className="space-y-1">
            <Label>Chief Complaint *</Label>
            <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Blood Pressure</Label>
              <Input placeholder="120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Pulse</Label>
              <Input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Temp (°C)</Label>
              <Input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Diagnosis</Label>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Treatment Plan</Label>
            <Input value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} />
          </div>

          <Button disabled={!chiefComplaint || createRecord.isPending} onClick={handleCreateRecord}>
            {createRecord.isPending ? 'Saving...' : 'Save Medical Record'}
          </Button>
        </div>
      ) : (
        <>
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Medical record saved. You can now order tests and/or write a prescription.
          </p>
          <LabOrderSection medicalRecordId={medicalRecordId} hospitalId={hospitalId} />
          <PrescriptionSection medicalRecordId={medicalRecordId} hospitalId={hospitalId} />
        </>
      )}
    </div>
  );
}

function LabOrderSection({ medicalRecordId, hospitalId }: { medicalRecordId: string; hospitalId: string | null }) {
  const { data: labTests, isLoading } = useLabTests();
  const createLabOrder = useCreateLabOrder();
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      await createLabOrder.mutateAsync({
        medicalRecordId,
        items: selectedTestIds.map((labTestId) => ({ labTestId })),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Lab Order</h2>
        <p className="mt-2 text-sm text-green-700">Lab order placed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-700">Order Lab Tests</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading && <p className="text-sm text-zinc-500">Loading tests...</p>}
      <div className="space-y-1">
        {labTests?.map((test) => (
          <label key={test.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selectedTestIds.includes(test.id)} onChange={() => toggleTest(test.id)} />
            {test.name}
          </label>
        ))}
      </div>
      <Button size="sm" disabled={selectedTestIds.length === 0 || createLabOrder.isPending} onClick={handleSubmit}>
        {createLabOrder.isPending ? 'Ordering...' : 'Order Selected Tests'}
      </Button>
    </div>
  );
}

function PrescriptionSection({ medicalRecordId, hospitalId }: { medicalRecordId: string; hospitalId: string | null }) {
  const { data: medicines, isLoading } = useMedicines(hospitalId);
  const createPrescription = useCreatePrescription();
  const [rows, setRows] = useState<PrescriptionRow[]>([{ ...emptyRow }]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (index: number, field: keyof PrescriptionRow, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);

  const isRowComplete = (row: PrescriptionRow) =>
    row.medicineId && row.dosage && row.dosageUnit && row.frequency && row.durationDays && row.quantity;

  const handleSubmit = async () => {
    setError(null);
    if (!rows.every(isRowComplete)) {
      setError('Fill in every field for each medicine row before saving.');
      return;
    }
    try {
      await createPrescription.mutateAsync({
        medicalRecordId,
        items: rows.map((row) => ({
          medicineId: row.medicineId,
          dosage: row.dosage,
          dosageUnit: row.dosageUnit,
          frequency: row.frequency as Frequency,
          durationDays: Number(row.durationDays),
          quantity: Number(row.quantity),
          instructions: row.instructions || undefined,
        })),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Prescription</h2>
        <p className="mt-2 text-sm text-green-700">Prescription saved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-700">Write Prescription</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading && <p className="text-sm text-zinc-500">Loading medicines...</p>}

      {rows.map((row, index) => (
        <div key={index} className="space-y-2 border-b border-zinc-100 pb-3 last:border-0">
          <Select value={row.medicineId} onValueChange={(v) => updateRow(index, 'medicineId', v)}>
            <SelectTrigger><SelectValue placeholder="Medicine" /></SelectTrigger>
            <SelectContent>
              {medicines?.map((med) => (
                <SelectItem key={med.id} value={med.id}>{med.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Dosage (e.g. 500)" value={row.dosage} onChange={(e) => updateRow(index, 'dosage', e.target.value)} />
            <Input placeholder="Unit (mg)" value={row.dosageUnit} onChange={(e) => updateRow(index, 'dosageUnit', e.target.value)} />
            <Select value={row.frequency} onValueChange={(v) => updateRow(index, 'frequency', v)}>
              <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
              <SelectContent>
                {Object.values(Frequency).map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Duration (days)" value={row.durationDays} onChange={(e) => updateRow(index, 'durationDays', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Quantity" value={row.quantity} onChange={(e) => updateRow(index, 'quantity', e.target.value)} />
            <Input placeholder="Instructions (optional)" value={row.instructions} onChange={(e) => updateRow(index, 'instructions', e.target.value)} />
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow}>Add Medicine</Button>
        <Button type="button" size="sm" disabled={createPrescription.isPending} onClick={handleSubmit}>
          {createPrescription.isPending ? 'Saving...' : 'Save Prescription'}
        </Button>
      </div>
    </div>
  );
}