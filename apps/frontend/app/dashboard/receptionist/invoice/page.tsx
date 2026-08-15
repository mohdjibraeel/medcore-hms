'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePatientSearch } from '@/services/patients.service';
import { useAppointmentsByPatient } from '@/services/appointments.service';
import { useCreateInvoice, useAddInvoiceItem, useFinalizeInvoice } from '@/services/invoices.service';
import { ApiError } from '@/lib/api-client';
import { InvoiceItemCategory, type PatientSearchResult, type AppointmentForPatient, type Invoice } from '@medcore/shared-types';

export default function GenerateInvoicePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentForPatient | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [itemDescription, setItemDescription] = useState('');
  const [itemCategory, setItemCategory] = useState<InvoiceItemCategory | ''>('');
  const [itemAmount, setItemAmount] = useState('');

  const { data: patients, isLoading: patientsLoading } = usePatientSearch(searchTerm);
  const { data: appointments, isLoading: appointmentsLoading } = useAppointmentsByPatient(selectedPatient?.id ?? null);
  const createInvoice = useCreateInvoice();
  const addItem = useAddInvoiceItem();
  const finalizeInvoice = useFinalizeInvoice();

  const handleCreateInvoice = async (appt: AppointmentForPatient) => {
    setErrorMessage(null);
    try {
      const result = await createInvoice.mutateAsync(appt.id);
      setSelectedAppointment(appt);
      setInvoice(result);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  const handleAddItem = async () => {
    if (!invoice || !itemDescription || !itemCategory || !itemAmount) return;
    setErrorMessage(null);
    try {
      const updated = await addItem.mutateAsync({
        invoiceId: invoice.id,
        description: itemDescription,
        category: itemCategory,
        amount: Number(itemAmount),
      });
      setInvoice(updated);
      setItemDescription('');
      setItemCategory('');
      setItemAmount('');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  const handleFinalize = async () => {
    if (!invoice) return;
    setErrorMessage(null);
    try {
      const finalized = await finalizeInvoice.mutateAsync(invoice.id);
      setInvoice(finalized);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-zinc-900">Generate Invoice</h1>

      {errorMessage && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      {/* Step 1: find the patient */}
      {!selectedPatient && (
        <div className="mt-6">
          <Label>Search Patient</Label>
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
          <div className="mt-3 space-y-2">
            {patientsLoading && <p className="text-sm text-zinc-500">Loading...</p>}
            {patients?.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPatient(p)}
                className="block w-full rounded-md border border-zinc-200 bg-white p-3 text-left text-sm hover:bg-zinc-50"
              >
                <div className="font-medium text-zinc-900">{p.firstName} {p.lastName ?? ''}</div>
                <div className="text-zinc-500">{p.email}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: pick which appointment to invoice */}
      {selectedPatient && !invoice && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 text-sm">
            <span>Invoicing for <strong>{selectedPatient.firstName} {selectedPatient.lastName ?? ''}</strong></span>
            <button type="button" onClick={() => { setSelectedPatient(null); setSelectedAppointment(null); }} className="text-zinc-500 underline">
              Change
            </button>
          </div>

          <Label>Select Appointment</Label>
          {appointmentsLoading && <p className="text-sm text-zinc-500">Loading appointments...</p>}
          <div className="space-y-2">
            {appointments?.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3">
                <div className="text-sm">
                  <div className="font-medium text-zinc-900">
                    Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName ?? ''} — {appt.department.name}
                  </div>
                  <div className="text-zinc-500">
                    {new Date(appt.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {appt.status}
                  </div>
                </div>
                <Button size="sm" disabled={createInvoice.isPending} onClick={() => handleCreateInvoice(appt)}>
                  Generate Invoice
                </Button>
              </div>
            ))}
            {appointments?.length === 0 && <p className="text-sm text-zinc-500">No appointments found for this patient.</p>}
          </div>
        </div>
      )}

      {/* Step 3: add line items, then finalize */}
      {invoice && selectedAppointment && (
        <div className="mt-6 space-y-4">
          <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm">
            Invoice for <strong>{selectedPatient?.firstName}</strong> — Dr. {selectedAppointment.doctor.user.firstName} appointment ·{' '}
            <span className="font-medium">{invoice.status}</span>
          </div>

          <div className="space-y-2">
            {invoice.items?.map((item) => (
              <div key={item.id} className="flex justify-between rounded-md border border-zinc-200 bg-white p-3 text-sm">
                <span>{item.description} <span className="text-zinc-400">({item.category})</span></span>
                <span>₹{item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-semibold">
              <span>Total</span>
              <span>₹{invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {invoice.status === 'DRAFT' && (
            <>
              <div className="rounded-md border border-zinc-200 bg-white p-4 space-y-3">
                <Label>Add Line Item</Label>
                <Input placeholder="Description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
                <Select value={itemCategory} onValueChange={(v) => setItemCategory(v as InvoiceItemCategory)}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(InvoiceItemCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" min={0.01} step={0.01} placeholder="Amount (₹)" value={itemAmount} onChange={(e) => setItemAmount(e.target.value)} />
                <Button
                  type="button"
                  className="w-full"
                  disabled={addItem.isPending || !itemDescription || !itemCategory || !itemAmount}
                  onClick={handleAddItem}
                >
                  {addItem.isPending ? 'Adding...' : 'Add Item'}
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={finalizeInvoice.isPending || !invoice.items?.length}
                onClick={handleFinalize}
              >
                {finalizeInvoice.isPending ? 'Finalizing...' : 'Finalize Invoice'}
              </Button>
            </>
          )}

          {invoice.status === 'FINALIZED' && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Invoice finalized. Total: ₹{invoice.totalAmount.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}