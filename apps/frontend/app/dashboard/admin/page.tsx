'use client';

import { useHospitalStats } from '@/services/hospitals.service';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

export default function HospitalAdminDashboardPage() {
  const { data: stats, isLoading, isError } = useHospitalStats();

  if (isLoading) return <p className="text-sm text-zinc-500">Loading dashboard...</p>;
  if (isError || !stats) return <p className="text-sm text-red-600">Couldn&apos;t load hospital stats.</p>;

  const maxDeptCount = Math.max(...stats.departmentCounts.map((d) => d.appointmentCount), 1);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Hospital Overview</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KpiCard label="Patients Today" value={stats.patientsToday} />
          <KpiCard label="Revenue Today" value={`₹${stats.revenueToday.toFixed(2)}`} />
          <KpiCard label="Doctors" value={stats.doctorCount} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Appointment Volume — Last 7 Days</h2>
        <div className="mt-3 h-64 rounded-lg border border-zinc-200 bg-white p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.appointmentVolume}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Department Activity</h2>
        <div className="mt-3 space-y-2">
          {stats.departmentCounts.map((dept) => {
            const intensity = dept.appointmentCount / maxDeptCount;
            return (
              <div key={dept.departmentName} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-sm text-zinc-700">{dept.departmentName}</div>
                <div className="h-6 flex-1 rounded bg-zinc-100">
                  <div
                    className="h-6 rounded bg-blue-600"
                    style={{ width: `${Math.max(intensity * 100, 4)}%` }}
                  />
                </div>
                <div className="w-8 shrink-0 text-right text-sm text-zinc-500">{dept.appointmentCount}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Low Stock Alerts</h2>
        <div className="mt-3 space-y-2">
          {stats.lowStockMedicines.length === 0 && (
            <p className="text-sm text-zinc-500">Nothing low on stock right now.</p>
          )}
          {stats.lowStockMedicines.map((med) => (
            <div
              key={med.name}
              className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm"
            >
              <span className="text-red-800">{med.name}</span>
              <span className="text-red-600">{med.totalStock} in stock (reorder at {med.reorderLevel})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}