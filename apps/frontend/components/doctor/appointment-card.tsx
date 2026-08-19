"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AppointmentStatus,
  type AppointmentWithPatientDetails,
} from "@medcore/shared-types";

export const NEXT_STATUS: Partial<
  Record<AppointmentStatus, { label: string; next: AppointmentStatus }[]>
> = {
  [AppointmentStatus.PENDING]: [
    { label: "Confirm", next: AppointmentStatus.CONFIRMED },
    { label: "Cancel", next: AppointmentStatus.CANCELLED },
  ],
  [AppointmentStatus.CONFIRMED]: [
    { label: "Start", next: AppointmentStatus.IN_PROGRESS },
    { label: "No-show", next: AppointmentStatus.NO_SHOW },
    { label: "Cancel", next: AppointmentStatus.CANCELLED },
  ],
  [AppointmentStatus.IN_PROGRESS]: [
    { label: "Complete", next: AppointmentStatus.COMPLETED },
  ],
};

export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: "bg-amber-50 text-amber-700",
  [AppointmentStatus.CONFIRMED]: "bg-blue-50 text-blue-700",
  [AppointmentStatus.IN_PROGRESS]: "bg-purple-50 text-purple-700",
  [AppointmentStatus.COMPLETED]: "bg-green-50 text-green-700",
  [AppointmentStatus.CANCELLED]: "bg-zinc-100 text-zinc-500",
  [AppointmentStatus.NO_SHOW]: "bg-red-50 text-red-700",
  [AppointmentStatus.EMERGENCY]: "bg-red-100 text-red-800",
};

interface Props {
  appt: AppointmentWithPatientDetails;
  showActions?: boolean;
  showDate?: boolean;
  onStatusChange?: (id: string, status: AppointmentStatus) => void;
  isPending?: boolean;
}

export function AppointmentCard({
  appt,
  showActions = true,
  showDate = false,
  onStatusChange,
  isPending,
}: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-900">
            {appt.patient.user.firstName} {appt.patient.user.lastName ?? ""}
          </div>
          <div className="text-sm text-zinc-500">{appt.department.name}</div>
          <div className="mt-1 text-sm text-zinc-500">
            {showDate
              ? new Date(appt.scheduledAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : new Date(appt.scheduledAt).toLocaleTimeString(undefined, {
                  timeStyle: "short",
                })}
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[appt.status]}`}
        >
          {appt.status}
        </span>
      </div>

      {showActions && appt.status !== AppointmentStatus.PENDING && (
        <Link
          href={`/dashboard/doctor/encounter/${appt.id}?patientName=${encodeURIComponent(
            `${appt.patient.user.firstName} ${appt.patient.user.lastName ?? ""}`.trim(),
          )}`}
          className="mt-2 inline-block text-sm text-blue-600 underline"
        >
          Start Encounter
        </Link>
      )}

      {showActions && onStatusChange && NEXT_STATUS[appt.status] && (
        <div className="mt-3 flex gap-2">
          {NEXT_STATUS[appt.status]!.map((action) => (
            <Button
              key={action.next}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => onStatusChange(appt.id, action.next)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
