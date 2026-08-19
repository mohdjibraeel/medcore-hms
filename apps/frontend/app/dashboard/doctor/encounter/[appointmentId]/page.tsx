"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import {
  useCreateMedicalRecord,
  useMedicalRecordByAppointment,
} from "@/services/medical-records.service";
import {
  useLabTests,
  useCreateLabOrder,
  useLabOrdersByMedicalRecord,
} from "@/services/lab-orders.service";
import { useMedicines } from "@/services/pharmacy.service";
import { useCreatePrescription } from "@/services/prescriptions.service";
import { ApiError } from "@/lib/api-client";
import {
  Frequency,
  Prescription,
  type MedicalRecord,
} from "@medcore/shared-types";

interface PrescriptionRow {
  medicineId: string;
  dosage: string;
  dosageUnit: string;
  frequency: Frequency | "";
  durationDays: string;
  quantity: string;
  instructions: string;
}

const emptyRow: PrescriptionRow = {
  medicineId: "",
  dosage: "",
  dosageUnit: "",
  frequency: "",
  durationDays: "",
  quantity: "",
  instructions: "",
};

function ExistingRecordSummary({
  record,
  justSaved = false,
}: {
  record: MedicalRecord;
  justSaved?: boolean;
}) {
  const fields: [string, string | number | null][] = [
    ["Chief Complaint", record.chiefComplaint],
    ["Blood Pressure", record.bloodPressure],
    ["Pulse", record.pulse],
    ["Temperature (°C)", record.temperature],
    ["SpO2 (%)", record.spo2],
    ["Diagnosis", record.diagnosis],
    ["Treatment Plan", record.treatmentPlan],
    ["Allergies", record.allergies],
  ];

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700">
          {justSaved
            ? "Medical Record — Saved"
            : "Medical Record — Already on File"}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {justSaved
            ? "Saved successfully. Review below, then continue below."
            : "This encounter's vitals and complaint were already recorded (e.g. by a nurse). Review below, then continue below — no need to fill this in again."}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {fields
          .filter(
            ([, value]) =>
              value !== null && value !== undefined && value !== "",
          )
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-900">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

export default function EncounterPage() {
  const params = useParams<{ appointmentId: string }>();
  const searchParams = useSearchParams();
  const patientName = searchParams.get("patientName") ?? "Patient";
  const hospitalId = useAuthStore((s) => s.user?.hospitalId) ?? null;

  const { data: existingRecord, isLoading: isCheckingRecord } =
    useMedicalRecordByAppointment(params.appointmentId);
  const [medicalRecordId, setMedicalRecordId] = useState<string | null>(null);
  const [justCreatedRecord, setJustCreatedRecord] =
    useState<MedicalRecord | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [labGateCleared, setLabGateCleared] = useState(false);

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");

  const createRecord = useCreateMedicalRecord();

  useEffect(() => {
    if (existingRecord) {
      setMedicalRecordId(existingRecord.id);
    }
  }, [existingRecord]);

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
      setJustCreatedRecord(record);
    } catch (err) {
      setRecordError(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">
          Encounter — {patientName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Record vitals, then decide on labs before prescribing.
        </p>
      </div>

      {isCheckingRecord ? (
        <p className="text-sm text-zinc-500">
          Checking for an existing medical record...
        </p>
      ) : !medicalRecordId ? (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">
            Medical Record
          </h2>
          {recordError && <p className="text-sm text-red-600">{recordError}</p>}

          <div className="space-y-1">
            <Label>Chief Complaint *</Label>
            <Input
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Blood Pressure</Label>
              <Input
                placeholder="120/80"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Pulse</Label>
              <Input
                type="number"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Temp (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Diagnosis</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Treatment Plan</Label>
            <Input
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
            />
          </div>

          <Button
            disabled={!chiefComplaint || createRecord.isPending}
            onClick={handleCreateRecord}
          >
            {createRecord.isPending ? "Saving..." : "Save Medical Record"}
          </Button>
        </div>
      ) : (
        <>
          {justCreatedRecord ? (
            <ExistingRecordSummary record={justCreatedRecord} justSaved />
          ) : existingRecord ? (
            <ExistingRecordSummary record={existingRecord} />
          ) : null}

          <LabGate
            medicalRecordId={medicalRecordId}
            cleared={labGateCleared}
            onCleared={() => setLabGateCleared(true)}
          />
          {labGateCleared && (
            <PrescriptionSection
              medicalRecordId={medicalRecordId}
              hospitalId={hospitalId}
            />
          )}
        </>
      )}
    </div>
  );
}

const LAB_STEPS: { key: string; label: string }[] = [
  { key: "ORDERED", label: "Ordered" },
  { key: "SAMPLE_COLLECTED", label: "Sample Collected" },
  { key: "RESULT_UPLOADED", label: "Results Uploaded" },
  { key: "APPROVED", label: "Approved" },
];

function LabGate({
  medicalRecordId,
  cleared,
  onCleared,
}: {
  medicalRecordId: string;
  cleared: boolean;
  onCleared: () => void;
}) {
  // All hooks first, unconditionally, every render — no early returns above this line.
  const { data: orders, isLoading } =
    useLabOrdersByMedicalRecord(medicalRecordId);
  const { data: labTests } = useLabTests();
  const createLabOrder = useCreateLabOrder();

  const [isOrdering, setIsOrdering] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Once the doctor has moved on to prescribing, keep the lab outcome
  // visible as a permanent read-only summary — same pattern as the medical
  // record card not disappearing. If labs were skipped entirely, there's
  // nothing to show.
  if (cleared) {
    if (!orders || orders.length === 0) return null;
    return (
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Lab Results</h2>
        {orders.map((order) => (
          <div key={order.id} className="space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-zinc-700">{item.testName}</span>
                <span
                  className={
                    item.isFlagged
                      ? "font-medium text-red-600"
                      : "text-zinc-900"
                  }
                >
                  {item.resultValue} {item.unit}
                  {item.isFlagged && " \u26A0"}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <p className="text-sm text-zinc-500">Checking lab order status...</p>
    );
  }

  const hasOrders = (orders?.length ?? 0) > 0;
  const allApproved =
    hasOrders && orders!.every((o) => o.status === "APPROVED");

  const alreadyOrderedTestIds = new Set(
    (orders ?? []).flatMap((order) =>
      order.items.map((item) => item.labTestId),
    ),
  );
  const availableTests = (labTests ?? []).filter(
    (t) => !alreadyOrderedTestIds.has(t.id),
  );

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      await createLabOrder.mutateAsync({
        medicalRecordId,
        items: selectedTestIds.map((labTestId) => ({ labTestId })),
      });
      setSelectedTestIds([]);
      setIsOrdering(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  if (isOrdering) {
    return (
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">
          {hasOrders ? "Order Additional Tests" : "Order Lab Tests"}
        </h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-1">
          {availableTests.length === 0 && (
            <p className="text-sm text-zinc-400">
              No further tests available to order.
            </p>
          )}
          {availableTests.map((test) => (
            <label key={test.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedTestIds.includes(test.id)}
                onChange={() => toggleTest(test.id)}
              />
              {test.name}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsOrdering(false);
              setSelectedTestIds([]);
              setError(null);
            }}
          >
            Back
          </Button>
          <Button
            size="sm"
            disabled={selectedTestIds.length === 0 || createLabOrder.isPending}
            onClick={handleSubmit}
          >
            {createLabOrder.isPending ? "Ordering..." : "Order Selected Tests"}
          </Button>
        </div>
      </div>
    );
  }

  if (allApproved) {
    return (
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Lab Results</h2>
        {orders!.map((order) => (
          <div key={order.id} className="space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-zinc-700">{item.testName}</span>
                <span
                  className={
                    item.isFlagged
                      ? "font-medium text-red-600"
                      : "text-zinc-900"
                  }
                >
                  {item.resultValue} {item.unit}
                  {item.isFlagged && " \u26A0"}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div className="flex gap-2">
          {availableTests.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOrdering(true)}
            >
              Add More Tests
            </Button>
          )}
          <Button size="sm" onClick={onCleared}>
            Continue to Prescription
          </Button>
        </div>
      </div>
    );
  }

  if (hasOrders) {
    return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">
            Waiting on Lab Results
          </h2>
          <p className="text-xs text-zinc-500">
            Prescription is on hold until every ordered test comes back and is
            approved by the lab.
          </p>
        </div>

        {orders!.map((order) => {
          const currentIndex = LAB_STEPS.findIndex(
            (s) => s.key === order.status,
          );
          return (
            <div
              key={order.id}
              className="space-y-2 border-t border-zinc-100 pt-3 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap gap-2 text-xs">
                {LAB_STEPS.map((s, i) => (
                  <span
                    key={s.key}
                    className={`rounded-full px-2 py-1 ${
                      i <= currentIndex
                        ? "bg-blue-50 text-blue-700"
                        : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
              <ul className="text-sm text-zinc-600">
                {order.items.map((item) => (
                  <li key={item.id}>{item.testName}</li>
                ))}
              </ul>
            </div>
          );
        })}

        {availableTests.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsOrdering(true)}
          >
            Add More Tests
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-700">Lab Tests</h2>
      <p className="text-sm text-zinc-600">
        Does this patient need any lab tests before you prescribe?
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setIsOrdering(true)}>
          Yes, order tests
        </Button>
        <Button size="sm" onClick={onCleared}>
          No, skip to prescription
        </Button>
      </div>
    </div>
  );
}
function PrescriptionSection({
  medicalRecordId,
  hospitalId,
}: {
  medicalRecordId: string;
  hospitalId: string | null;
}) {
  const { data: medicines, isLoading } = useMedicines(hospitalId);
  const createPrescription = useCreatePrescription();
  const [rows, setRows] = useState<PrescriptionRow[]>([{ ...emptyRow }]);
  const [savedPrescription, setSavedPrescription] =
    useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (
    index: number,
    field: keyof PrescriptionRow,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);

  const isRowComplete = (row: PrescriptionRow) =>
    row.medicineId &&
    row.dosage &&
    row.dosageUnit &&
    row.frequency &&
    row.durationDays &&
    row.quantity;

  const handleSubmit = async () => {
    setError(null);
    if (!rows.every(isRowComplete)) {
      setError("Fill in every field for each medicine row before saving.");
      return;
    }
    try {
      const created = await createPrescription.mutateAsync({
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
      setSavedPrescription(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  if (savedPrescription) {
    const medicineName = (id: string) =>
      medicines?.find((m) => m.id === id)?.name ?? "Unknown medicine";
    return (
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">
          Prescription — Saved
        </h2>
        <div className="divide-y divide-zinc-100">
          {savedPrescription.items.map((item) => (
            <div key={item.id} className="py-2 text-sm">
              <div className="font-medium text-zinc-900">
                {medicineName(item.medicineId)}
              </div>
              <div className="text-zinc-500">
                {item.dosage}
                {item.dosageUnit} &middot; {item.frequency} &middot;{" "}
                {item.durationDays} days &middot; Qty {item.quantity}
              </div>
              {item.instructions && (
                <div className="text-zinc-500">{item.instructions}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-700">
        Write Prescription
      </h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading && (
        <p className="text-sm text-zinc-500">Loading medicines...</p>
      )}

      {rows.map((row, index) => (
        <div
          key={index}
          className="space-y-2 border-b border-zinc-100 pb-3 last:border-0"
        >
          <Select
            value={row.medicineId}
            onValueChange={(v) => updateRow(index, "medicineId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Medicine" />
            </SelectTrigger>
            <SelectContent>
              {medicines?.map((med) => (
                <SelectItem key={med.id} value={med.id}>
                  {med.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-4 gap-2">
            <Input
              placeholder="Dosage (e.g. 500)"
              value={row.dosage}
              onChange={(e) => updateRow(index, "dosage", e.target.value)}
            />
            <Input
              placeholder="Unit (mg)"
              value={row.dosageUnit}
              onChange={(e) => updateRow(index, "dosageUnit", e.target.value)}
            />
            <Select
              value={row.frequency}
              onValueChange={(v) => updateRow(index, "frequency", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Frequency).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Duration (days)"
              value={row.durationDays}
              onChange={(e) => updateRow(index, "durationDays", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Quantity"
              value={row.quantity}
              onChange={(e) => updateRow(index, "quantity", e.target.value)}
            />
            <Input
              placeholder="Instructions (optional)"
              value={row.instructions}
              onChange={(e) => updateRow(index, "instructions", e.target.value)}
            />
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          Add Medicine
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={createPrescription.isPending}
          onClick={handleSubmit}
        >
          {createPrescription.isPending ? "Saving..." : "Save Prescription"}
        </Button>
      </div>
    </div>
  );
}
