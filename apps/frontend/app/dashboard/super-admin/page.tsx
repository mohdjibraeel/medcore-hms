"use client";

import { useState } from "react";
import {
  usePlatformStats,
  useHospitals,
  useCreateHospital,
  useUpdateHospitalStatus,
  useCreateHospitalAdmin,
  useUpdateHospitalAdmin,
} from "@/services/hospitals.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  VERIFIED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
};

export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: hospitals, isLoading: hospitalsLoading } = useHospitals();
  const createHospital = useCreateHospital();
  const updateStatus = useUpdateHospitalStatus();
  const createAdmin = useCreateHospitalAdmin();
  const updateAdmin = useUpdateHospitalAdmin();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tracks which hospital's "create admin" form is currently open (by hospital id).
  // null means no form is open.
  const [adminFormHospitalId, setAdminFormHospitalId] = useState<string | null>(
    null,
  );
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const handleCreate = async () => {
    if (!name || !slug) return;
    setErrorMessage(null);
    try {
      await createHospital.mutateAsync({ name, slug });
      setName("");
      setSlug("");
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    }
  };

  const handleStatusChange = async (
    id: string,
    status: "VERIFIED" | "REJECTED",
  ) => {
    setErrorMessage(null);
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    }
  };

  const handleSaveAdmin = async (hospitalId: string, isEditing: boolean) => {
    if (!isEditing && (!adminEmail || !adminPassword || !adminFirstName))
      return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const admin = isEditing
        ? await updateAdmin.mutateAsync({
            hospitalId,
            email: adminEmail || undefined,
            password: adminPassword || undefined,
            firstName: adminFirstName || undefined,
            lastName: adminLastName || undefined,
          })
        : await createAdmin.mutateAsync({
            hospitalId,
            email: adminEmail,
            password: adminPassword,
            firstName: adminFirstName,
            lastName: adminLastName || undefined,
          });
      setSuccessMessage(
        isEditing
          ? `Admin account updated for ${admin.email}.`
          : `Admin account created for ${admin.email}.`,
      );
      setAdminFormHospitalId(null);
      setAdminEmail("");
      setAdminPassword("");
      setAdminFirstName("");
      setAdminLastName("");
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    }
  };

  const openAdminForm = (
    hospitalId: string,
    admin: { email: string; firstName: string; lastName: string | null } | null,
  ) => {
    if (adminFormHospitalId === hospitalId) {
      setAdminFormHospitalId(null);
      return;
    }
    setAdminFormHospitalId(hospitalId);
    setAdminEmail(admin?.email ?? "");
    setAdminPassword("");
    setAdminFirstName(admin?.firstName ?? "");
    setAdminLastName(admin?.lastName ?? "");
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">
          Platform Overview
        </h1>
        {statsLoading && (
          <p className="mt-2 text-sm text-zinc-500">Loading...</p>
        )}
        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Hospitals" value={stats.totalHospitals} />
            <KpiCard label="Doctors" value={stats.totalDoctors} />
            <KpiCard label="Patients" value={stats.totalPatients} />
            <KpiCard
              label="Total Revenue"
              value={`₹${stats.totalRevenue.toFixed(2)}`}
            />
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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-600">
          {successMessage}
        </p>
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">
          Onboard New Hospital
        </h2>
        <div className="mt-3 flex items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="hospitalName">Name</Label>
            <Input
              id="hospitalName"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="hospitalSlug">Slug</Label>
            <Input
              id="hospitalSlug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={createHospital.isPending || !name || !slug}
          >
            {createHospital.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Hospitals</h2>
        <div className="mt-3 space-y-2">
          {hospitalsLoading && (
            <p className="text-sm text-zinc-500">Loading...</p>
          )}
          {hospitals?.map((h) => (
            <div
              key={h.id}
              className="rounded-lg border border-zinc-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {h.name}
                  </div>
                  <div className="text-sm text-zinc-500">{h.slug}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[h.status]}`}
                  >
                    {h.status}
                  </span>
                  {h.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => handleStatusChange(h.id, "VERIFIED")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() => handleStatusChange(h.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {h.status === "VERIFIED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAdminForm(h.id, h.admin)}
                    >
                      {adminFormHospitalId === h.id
                        ? "Cancel"
                        : h.admin
                          ? "Update Admin"
                          : "Create Admin"}
                    </Button>
                  )}
                </div>
              </div>

              {h.admin && (
                <div className="mt-2 text-sm text-zinc-500">
                  Admin: {h.admin.firstName} {h.admin.lastName ?? ""} (
                  {h.admin.email})
                </div>
              )}

              {adminFormHospitalId === h.id && (
                <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`adminEmail-${h.id}`}>Email</Label>
                      <Input
                        id={`adminEmail-${h.id}`}
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`adminPassword-${h.id}`}>
                        Password{" "}
                        {h.admin ? "(leave blank to keep current)" : ""}
                      </Label>
                      <Input
                        id={`adminPassword-${h.id}`}
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`adminFirstName-${h.id}`}>
                        First Name
                      </Label>
                      <Input
                        id={`adminFirstName-${h.id}`}
                        value={adminFirstName}
                        onChange={(e) => setAdminFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`adminLastName-${h.id}`}>Last Name</Label>
                      <Input
                        id={`adminLastName-${h.id}`}
                        value={adminLastName}
                        onChange={(e) => setAdminLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={
                      createAdmin.isPending ||
                      updateAdmin.isPending ||
                      (!h.admin &&
                        (!adminEmail || !adminPassword || !adminFirstName))
                    }
                    onClick={() => handleSaveAdmin(h.id, !!h.admin)}
                  >
                    {createAdmin.isPending || updateAdmin.isPending
                      ? "Saving..."
                      : "Save Admin"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
