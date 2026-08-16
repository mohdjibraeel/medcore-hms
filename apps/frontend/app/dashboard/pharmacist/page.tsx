"use client";

import { useState } from "react";
import { usePendingPrescriptions } from "@/services/prescriptions.service";
import { useMedicines, useDispenseMedicine } from "@/services/pharmacy.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import type { PendingPrescriptionItem } from "@medcore/shared-types";
import { useAuthStore } from "@/store/authStore";

function DispenseRow({ item }: { item: PendingPrescriptionItem }) {
  const [quantity, setQuantity] = useState(item.remaining);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const dispense = useDispenseMedicine();

  const handleDispense = async () => {
    setMessage(null);
    try {
      await dispense.mutateAsync({ prescriptionItemId: item.id, quantity });
      setMessage({ type: "success", text: `Dispensed ${quantity} unit(s).` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-900">
            {item.medicineName}
          </div>
          <div className="text-sm text-zinc-500">
            {item.dosage}
            {item.dosageUnit} · {item.frequency} · {item.durationDays} days
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Patient: {item.patientName} · Prescribed by Dr. {item.doctorName}
          </div>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          {item.remaining} of {item.quantity} remaining
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={item.remaining}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-24"
        />
        <Button
          size="sm"
          disabled={
            dispense.isPending || quantity < 1 || quantity > item.remaining
          }
          onClick={handleDispense}
        >
          {dispense.isPending ? "Dispensing..." : "Dispense"}
        </Button>
      </div>

      {message && (
        <p
          className={`mt-2 text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}


function InventoryTable({ hospitalId }: { hospitalId: string | null }) {
  const { data: medicines, isLoading } = useMedicines(hospitalId);

  if (isLoading)
    return <p className="text-sm text-zinc-500">Loading inventory...</p>;

  return (
    <div className="space-y-2">
      {medicines?.map((med) => {
        const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
        const isLowStock = totalStock <= med.reorderLevel;
        const hasExpiredBatch = med.batches.some(
          (b) => new Date(b.expiryDate) < new Date(),
        );

        return (
          <div
            key={med.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3"
          >
            <div>
              <div className="text-sm font-medium text-zinc-900">
                {med.name}
              </div>
              <div className="text-sm text-zinc-500">
                {med.form} · {med.batches.length} batch(es)
                {hasExpiredBatch && (
                  <span className="ml-2 text-red-600">
                    · contains expired stock
                  </span>
                )}
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isLowStock
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {totalStock} in stock
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PharmacistDashboardPage() {
  const { data: pendingItems, isLoading, isError } = usePendingPrescriptions();

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">
        Pending Prescriptions
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Prescription items still waiting to be dispensed.
      </p>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
        {isError && (
          <p className="text-sm text-red-600">
            Couldn&apos;t load pending prescriptions.
          </p>
        )}
        {pendingItems?.length === 0 && (
          <p className="text-sm text-zinc-500">
            Nothing pending — all caught up.
          </p>
        )}
        {pendingItems?.map((item) => (
          <DispenseRow key={item.id} item={item} />
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Inventory</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Current medicine stock across all batches.
      </p>
      <div className="mt-4">
        <InventoryTable hospitalId={useAuthStore.getState().user?.hospitalId ?? null} />
      </div>
    </div>
  );
}
