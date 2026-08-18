'use client';

import { useStaffList } from '@/services/staff.service';
import type { StaffMember, RegisterableStaffRole } from '@medcore/shared-types';

const ROLE_ORDER: RegisterableStaffRole[] = [
  'NURSE',
  'RECEPTIONIST',
  'LAB_TECHNICIAN',
  'PHARMACIST',
  'ACCOUNTANT',
];

const ROLE_LABELS: Record<RegisterableStaffRole, string> = {
  NURSE: 'Nurses',
  RECEPTIONIST: 'Receptionists',
  LAB_TECHNICIAN: 'Lab Technicians',
  PHARMACIST: 'Pharmacists',
  ACCOUNTANT: 'Accountants',
};

function groupByRole(staff: StaffMember[]) {
  const groups = {} as Record<RegisterableStaffRole, StaffMember[]>;
  for (const role of ROLE_ORDER) groups[role] = [];
  for (const member of staff) {
    groups[member.role]?.push(member);
  }
  return groups;
}

export default function StaffListPage() {
  const { data: staff, isLoading } = useStaffList();

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading staff...</p>;
  }

  const groups = groupByRole(staff ?? []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-semibold text-zinc-900">Current Staff</h1>
      <p className="mt-1 text-sm text-zinc-500">All staff registered at your hospital, grouped by role.</p>

      <div className="mt-6 space-y-8">
        {ROLE_ORDER.map((role) => (
          <div key={role}>
            <h2 className="text-sm font-semibold text-zinc-700">
              {ROLE_LABELS[role]} <span className="text-zinc-400">({groups[role].length})</span>
            </h2>
            {groups[role].length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">None registered yet.</p>
            ) : (
              <div className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
                {groups[role].map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-zinc-900">
                        {member.firstName} {member.lastName ?? ''}
                      </div>
                      <div className="text-zinc-500">{member.email}</div>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}