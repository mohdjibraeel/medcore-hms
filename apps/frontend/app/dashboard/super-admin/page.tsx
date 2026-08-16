'use client';

import { useState } from 'react';
import { usePlatformStats, useHospitals, useCreateHospital, useUpdateHospitalStatus } from '@/services/hospitals.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
};

export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: hospitals, isLoading: hospitalsLoading } = useHospitals();
  const createHospital = useCreateHospital();
  const updateStatus = useUpdateHospitalStatus();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name || !slug) return;
    setErrorMessage(null);
    try {
      await createHospital.mutateAsync({ name, slug });
      setName('');
      setSlug('');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  const handleStatusChange = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    setErrorMessage(null);
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Platform Overview</h1>
        {statsLoading && <p className="mt-2 text-sm text-zinc-500">Loading...</p>}
        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Hospitals" value={stats.totalHospitals} />
            <KpiCard label="Doctors" value={stats.totalDoctors} />
            <KpiCard label="Patients" value={stats.totalPatients} />
            <KpiCard label="Total Revenue" value={`₹${stats.totalRevenue.toFixed(2)}`} />
          </div>
        )}
        {stats && (
          <div className="mt-3 flex gap-3 text-sm text-zinc-500">
            <span>Pending: {stats.hospitalsByStatus.PENDING}</span>
            <span>Verified: {stats.hospitalsByStatus.VERIFIED}</span>
            <span>Rejected: {stats.hospitalsByStatus.REJECTED}</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Onboard New Hospital</h2>
        <div className="mt-3 flex items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="hospitalName">Name</Label>
            <Input id="hospitalName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="hospitalSlug">Slug</Label>
            <Input id="hospitalSlug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={createHospital.isPending || !name || !slug}>
            {createHospital.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Hospitals</h2>
        <div className="mt-3 space-y-2">
          {hospitalsLoading && <p className="text-sm text-zinc-500">Loading...</p>}
          {hospitals?.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3">
              <div>
                <div className="text-sm font-medium text-zinc-900">{h.name}</div>
                <div className="text-sm text-zinc-500">{h.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[h.status]}`}>
                  {h.status}
                </span>
                {h.status === 'PENDING' && (
                  <>
                    <Button size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange(h.id, 'VERIFIED')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => handleStatusChange(h.id, 'REJECTED')}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}