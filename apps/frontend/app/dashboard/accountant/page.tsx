'use client';

import { useState } from 'react';
import { useHospitalStats } from '@/services/hospitals.service';
import { usePendingInvoices, useMarkInvoicePaid } from '@/services/invoices.service';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

export default function AccountantDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useHospitalStats();
  const { data: invoices, isLoading: invoicesLoading, isError } = usePendingInvoices();
  const markPaid = useMarkInvoicePaid();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMarkPaid = async (id: string) => {
    setErrorMessage(null);
    try {
      await markPaid.mutateAsync(id);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Financial Overview</h1>
        {statsLoading && <p className="mt-2 text-sm text-zinc-500">Loading...</p>}
        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KpiCard label="Revenue Today" value={`₹${stats.revenueToday.toFixed(2)}`} />
            <KpiCard label="Patients Today" value={stats.patientsToday} />
            <KpiCard label="Doctors" value={stats.doctorCount} />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Awaiting Payment Reconciliation</h2>
        <p className="mt-1 text-sm text-zinc-500">Finalized invoices not yet marked as paid.</p>

        {errorMessage && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
        )}

        <div className="mt-3 space-y-2">
          {invoicesLoading && <p className="text-sm text-zinc-500">Loading...</p>}
          {isError && <p className="text-sm text-red-600">Couldn&apos;t load invoices.</p>}
          {invoices?.length === 0 && (
            <p className="text-sm text-zinc-500">Nothing awaiting reconciliation right now.</p>
          )}
          {invoices?.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3">
              <div>
                <div className="text-sm font-medium text-zinc-900">
                  {invoice.patient.user.firstName} {invoice.patient.user.lastName ?? ''}
                </div>
                <div className="text-sm text-zinc-500">
                  {new Date(invoice.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-900">₹{invoice.totalAmount.toFixed(2)}</span>
                <Button size="sm" disabled={markPaid.isPending} onClick={() => handleMarkPaid(invoice.id)}>
                  {markPaid.isPending ? 'Updating...' : 'Mark Paid'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}