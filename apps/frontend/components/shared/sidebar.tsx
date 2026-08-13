'use client';

import Link from 'next/link';
import { Role } from '@medcore/shared-types';

interface SidebarItem {
  label: string;
  href: string;
}

function getSidebarItems(role: Role): SidebarItem[] {
  switch (role) {
    case Role.PATIENT:
      return [{ label: 'Overview', href: '/dashboard/patient' }];
    default:
      return [{ label: 'Overview', href: '/dashboard' }];
  }
}

export function Sidebar({ role }: { role: Role }) {
  const items = getSidebarItems(role);

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white p-4">
      <div className="mb-6 px-2 text-lg font-semibold text-zinc-900">MedCore HMS</div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}