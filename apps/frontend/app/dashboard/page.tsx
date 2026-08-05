"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invoicesError, setInvoicesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [error, setError] = useState("");
  const [recordsError, setRecordsError] = useState("");
  const { token, user, logout, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !token) {
      router.push("/login");
    }
  }, [hasHydrated, token, router]);

  // Fetch appointments
  useEffect(() => {
    if (!token) return;

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const patientId = "cmseexc870002lstvtn5pxs87";
        const response = await api.get(`/appointments?patientId=${patientId}`);
        const appointmentsData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setAppointments(appointmentsData);
      } catch (err: any) {
        setError(err.message || "Failed to fetch appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [token]);

  const updateAppointmentStatus = async (appointmentId: string) => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: "CONFIRMED",
      });

      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: "CONFIRMED" } : appt,
        ),
      );
    } catch (err: any) {
      console.error("Failed to update appointment:", err);
    }
  };

  // Fetch medical records
  useEffect(() => {
    if (!token) return;

    const fetchMedicalRecords = async () => {
      try {
        setLoadingRecords(true);
        const patientId = "cmseexc870002lstvtn5pxs87";
        const response = await api.get(
          `/medical-records?patientId=${patientId}`,
        );
        const recordsData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setMedicalRecords(recordsData);
      } catch (err: any) {
        setRecordsError(err.message || "Failed to fetch medical records");
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchMedicalRecords();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchInvoices = async () => {
      try {
        setLoadingInvoices(true);
        const patientId = "cmseexc870002lstvtn5pxs87";
        const response = await api.get(`/invoices?patientId=${patientId}`);
        const invoicesData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setInvoices(invoicesData);
      } catch (err: any) {
        setInvoicesError(err.message || "Failed to fetch invoices");
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [token]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {user?.firstName || user?.email || "Patient"}!
            </h1>
            <button
              onClick={() => logout()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Your Appointments
          </h2>

          {loading && (
            <p className="text-gray-500">Loading your appointments...</p>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            (!appointments || appointments.length === 0) && (
              <p className="text-gray-500">No appointments found.</p>
            )}

          {!loading && !error && appointments && appointments.length > 0 && (
            <ul className="divide-y divide-gray-200">
              {appointments.map((appt: any) => (
                <li key={appt.id} className="py-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-800">
                        {new Date(appt.scheduledAt).toLocaleDateString()} at{" "}
                        {new Date(appt.scheduledAt).toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Department: {appt.department?.name || "N/A"}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium
                      ${appt.status === "CONFIRMED" ? "bg-green-100 text-green-800" : ""}
                      ${appt.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : ""}
                      ${appt.status === "CANCELLED" ? "bg-red-100 text-red-800" : ""}
                      ${appt.status === "COMPLETED" ? "bg-blue-100 text-blue-800" : ""}
                    `}
                    >
                      {appt.status}
                    </span>
                    {appt.status === "PENDING" && (
                      <button
                        onClick={() => updateAppointmentStatus(appt.id)}
                        className="ml-3 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Medical Records Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Your Medical Records
          </h2>

          {loadingRecords && (
            <p className="text-gray-500">Loading your medical records...</p>
          )}

          {recordsError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {recordsError}
            </div>
          )}

          {!loadingRecords &&
            !recordsError &&
            (!medicalRecords || medicalRecords.length === 0) && (
              <p className="text-gray-500">No medical records found.</p>
            )}

          {!loadingRecords &&
            !recordsError &&
            medicalRecords &&
            medicalRecords.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {medicalRecords.map((record: any) => (
                  <li key={record.id} className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Doctor: Dr. {record.doctor?.user?.firstName}{" "}
                          {record.doctor?.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          Complaint: {record.chiefComplaint}
                        </p>
                        {record.diagnosis && (
                          <p className="text-sm text-gray-600">
                            Diagnosis: {record.diagnosis}
                          </p>
                        )}
                        {record.treatmentPlan && (
                          <p className="text-sm text-gray-600">
                            Treatment: {record.treatmentPlan}
                          </p>
                        )}
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {record.appointment?.status || "N/A"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
        {/* Billing Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Your Invoices
          </h2>

          {loadingInvoices && (
            <p className="text-gray-500">Loading your invoices...</p>
          )}

          {invoicesError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {invoicesError}
            </div>
          )}

          {!loadingInvoices && !invoicesError && invoices.length === 0 && (
            <p className="text-gray-500">No invoices found.</p>
          )}

          {!loadingInvoices && !invoicesError && invoices.length > 0 && (
            <ul className="divide-y divide-gray-200">
              {invoices.map((invoice: any) => (
                <li key={invoice.id} className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total: ₹{invoice.totalAmount.toFixed(2)}
                      </p>
                      <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                        {invoice.items?.map((item: any) => (
                          <li key={item.id}>
                            {item.description} — ₹{item.amount.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap
              ${invoice.status === "PAID" ? "bg-green-100 text-green-800" : ""}
              ${invoice.status === "FINALIZED" ? "bg-blue-100 text-blue-800" : ""}
              ${invoice.status === "DRAFT" ? "bg-yellow-100 text-yellow-800" : ""}
              ${invoice.status === "CANCELLED" ? "bg-red-100 text-red-800" : ""}
            `}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
