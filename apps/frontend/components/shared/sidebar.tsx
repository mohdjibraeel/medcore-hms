"use client";

import Link from "next/link";
import { Role } from "@medcore/shared-types";

interface SidebarItem {
  label: string;
  href: string;
}

function getSidebarItems(role: Role): SidebarItem[] {
  switch (role) {
    case Role.PATIENT:
      return [
        { label: "Overview", href: "/dashboard/patient" },
        { label: "Book Appointment", href: "/dashboard/patient/book" },
        { label: "My Appointments", href: "/dashboard/patient/appointments" },
      ];
    case Role.DOCTOR:
      return [{ label: "Today's Appointments", href: "/dashboard/doctor" }];
    case Role.PHARMACIST:
      return [{ label: "Dispensary", href: "/dashboard/pharmacist" }];
    case Role.RECEPTIONIST:
      return [
        { label: "Overview", href: "/dashboard/receptionist" },
        {
          label: "Register Patient",
          href: "/dashboard/receptionist/register-patient",
        },
        {
          label: "Book for Patient",
          href: "/dashboard/receptionist/book-for-patient",
        },
        { label: "Generate Invoice", href: "/dashboard/receptionist/invoice" },
      ];
    case Role.HOSPITAL_ADMIN:
      return [
        { label: "Overview", href: "/dashboard/admin" },
        { label: "Register Doctor", href: "/dashboard/admin/register-doctor" },
        { label: "Register Staff", href: "/dashboard/admin/register-staff" },
        { label: "Current Staff", href: "/dashboard/admin/staff" },
      ];
    case Role.SUPER_ADMIN:
      return [{ label: "Platform Overview", href: "/dashboard/super-admin" }];
    case Role.LAB_TECHNICIAN:
      return [{ label: "Lab Queue", href: "/dashboard/lab" }];
    case Role.ACCOUNTANT:
      return [{ label: "Overview", href: "/dashboard/accountant" }];
    case Role.NURSE:
      return [{ label: "Today's Patients", href: "/dashboard/nurse" }];
    default:
      return [{ label: "Overview", href: "/dashboard" }];
  }
}

export function Sidebar({ role }: { role: Role }) {
  const items = getSidebarItems(role);

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white p-4">
      <div className="mb-6 px-2 text-lg font-semibold text-zinc-900">
        MedCore HMS
      </div>
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
