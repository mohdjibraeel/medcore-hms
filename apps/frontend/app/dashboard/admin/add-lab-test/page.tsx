"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLabTest } from "@/services/lab-orders.service";
import { ApiError } from "@/lib/api-client";
import { useLabTests } from "@/services/lab-orders.service";

export default function AddLabTestPage() {
  const createLabTest = useCreateLabTest();
  const { data: existingTests, isLoading: isLoadingTests } = useLabTests();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [refRangeLow, setRefRangeLow] = useState("");
  const [refRangeHigh, setRefRangeHigh] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isValid = name.trim() && unit.trim() && price !== "";

  const handleSubmit = async () => {
    if (!isValid) return;
    setError(null);
    setSuccess(null);
    try {
      const created = await createLabTest.mutateAsync({
        name: name.trim(),
        unit: unit.trim(),
        refRangeLow: refRangeLow ? Number(refRangeLow) : undefined,
        refRangeHigh: refRangeHigh ? Number(refRangeHigh) : undefined,
        price: Number(price),
      });
      setSuccess(`"${created.name}" added at ₹${created.price}.`);
      setName("");
      setUnit("");
      setRefRangeLow("");
      setRefRangeHigh("");
      setPrice("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-lg font-semibold text-zinc-900">Add Lab Test</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Add a lab test your hospital offers, with its reference range and price.
        Doctors will be able to order it, and its price will feed automatically
        into patient invoices once results are approved.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <Label>Test Name</Label>
          <Input
            placeholder="e.g. Complete Blood Count"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Unit</Label>
          <Input
            placeholder="e.g. g/dL"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Reference Range — Low (optional)</Label>
            <Input
              type="number"
              step="0.01"
              value={refRangeLow}
              onChange={(e) => setRefRangeLow(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Reference Range — High (optional)</Label>
            <Input
              type="number"
              step="0.01"
              value={refRangeHigh}
              onChange={(e) => setRefRangeHigh(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>Price (₹)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        <Button
          className="w-full"
          disabled={!isValid || createLabTest.isPending}
          onClick={handleSubmit}
        >
          {createLabTest.isPending ? "Adding..." : "Add Lab Test"}
        </Button>
      </div>
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-700">
          Existing Lab Tests{" "}
          {existingTests && (
            <span className="text-zinc-400">({existingTests.length})</span>
          )}
        </h2>
        {isLoadingTests ? (
          <p className="mt-2 text-sm text-zinc-500">Loading...</p>
        ) : existingTests?.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">
            No lab tests yet — add one above.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
            {existingTests?.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-zinc-900">{test.name}</span>
                  <span className="ml-2 text-zinc-500">({test.unit})</span>
                </div>
                <span className="text-zinc-700">₹{test.price}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
