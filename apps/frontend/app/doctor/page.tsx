"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../lib/api";

// --- Types ---
interface MedicalRecordForm {
  appointmentId: string;
  chiefComplaint: string;
  bloodPressure: string;
  pulse: string;
  temperature: string;
  spo2: string;
  heightCm: string;
  weightKg: string;
  diagnosis: string;
  treatmentPlan: string;
  allergies: string;
}

interface PrescriptionItemForm {
  medicineId: string;
  dosage: string;
  dosageUnit: string;
  frequency: string;
  durationDays: string;
  quantity: string;
  instructions: string;
}

const emptyPrescriptionItem: PrescriptionItemForm = {
  medicineId: "",
  dosage: "",
  dosageUnit: "mg",
  frequency: "OD",
  durationDays: "",
  quantity: "",
  instructions: "",
};

const emptyMedicalForm: MedicalRecordForm = {
  appointmentId: "",
  chiefComplaint: "",
  bloodPressure: "",
  pulse: "",
  temperature: "",
  spo2: "",
  heightCm: "",
  weightKg: "",
  diagnosis: "",
  treatmentPlan: "",
  allergies: "",
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { token, user, hasHydrated } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Medical record form states
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [form, setForm] = useState<MedicalRecordForm>(emptyMedicalForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Prescription form states
  const [prescribingForAppointmentId, setPrescribingForAppointmentId] =
    useState<string | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<
    PrescriptionItemForm[]
  >([{ ...emptyPrescriptionItem }]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [submittingPrescription, setSubmittingPrescription] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState("");
  const [prescriptionSuccess, setPrescriptionSuccess] = useState("");

  // Medicines list (fetched once)
  const [medicines, setMedicines] = useState<any[]>([]);

  // Map appointmentId -> medicalRecordId (for showing prescription button)
  const [medicalRecordMap, setMedicalRecordMap] = useState<
    Record<string, string>
  >({});

  // Guard
  useEffect(() => {
    if (hasHydrated && !token) {
      router.push("/login");
    } else if (hasHydrated && user?.role !== "DOCTOR") {
      router.push("/dashboard");
    }
  }, [hasHydrated, token, user, router]);

  // Fetch appointments
  useEffect(() => {
    if (!token || !user?.doctor?.id) return;

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/appointments?doctorId=${user.doctor.id}`,
        );
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setAppointments(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [token, user?.doctor?.id]);

  // Fetch medicines list (for prescription dropdown)
  useEffect(() => {
    if (!token) return;
    const fetchMedicines = async () => {
      try {
        const response = await api.get("/medicines");
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setMedicines(data);
      } catch (err) {
        console.error("Failed to fetch medicines", err);
      }
    };
    fetchMedicines();
  }, [token]);

  // --- Medical Record Handlers ---
  const openMedicalForm = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setForm({ ...emptyMedicalForm, appointmentId });
    setFormError("");
    setFormSuccess("");
  };

  const handleMedicalFieldChange = (
    field: keyof MedicalRecordForm,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMedicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const rawPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(form)) {
      if (value === "") continue;
      rawPayload[key] = value;
    }

    const numericFields = [
      "pulse",
      "temperature",
      "spo2",
      "heightCm",
      "weightKg",
    ];
    for (const field of numericFields) {
      if (rawPayload[field] !== undefined) {
        rawPayload[field] = Number(rawPayload[field]);
      }
    }

    try {
      setSubmitting(true);
      // Capture the response to get the medical record ID
      const res = await api.post("/medical-records", rawPayload);
      const newRecordId = res.data?.id;
      if (newRecordId) {
        setMedicalRecordMap((prev) => ({
          ...prev,
          [form.appointmentId]: newRecordId,
        }));
      }
      setFormSuccess("Medical record created successfully!");
      setSelectedAppointmentId(null);
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Grab the existing record ID from the error response
        const existingId = err.response.data?.existingRecordId;
        if (existingId) {
          setMedicalRecordMap((prev) => ({
            ...prev,
            [form.appointmentId]: existingId,
          }));
        }
        setFormError("A medical record already exists for this appointment.");
      } else if (err.response?.status === 403) {
        setFormError("You are not the assigned doctor for this appointment.");
      } else {
        setFormError(
          err.response?.data?.message || "Failed to create medical record.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const markAsCompleted = async (appointmentId: string) => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: "COMPLETED",
      });
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: "COMPLETED" } : appt,
        ),
      );
    } catch (err: any) {
      console.error("Failed to mark as completed:", err);
    }
  };

  // --- Prescription Handlers ---
  const openPrescriptionForm = (appointmentId: string) => {
    setPrescribingForAppointmentId(appointmentId);
    setPrescriptionItems([{ ...emptyPrescriptionItem }]);
    setPrescriptionNotes("");
    setPrescriptionError("");
    setPrescriptionSuccess("");
  };

  const handlePrescriptionItemChange = (
    index: number,
    field: keyof PrescriptionItemForm,
    value: string,
  ) => {
    setPrescriptionItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addPrescriptionItem = () => {
    setPrescriptionItems((prev) => [...prev, { ...emptyPrescriptionItem }]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrescriptionError("");
    setPrescriptionSuccess("");

    const medicalRecordId = medicalRecordMap[prescribingForAppointmentId!];
    if (!medicalRecordId) {
      setPrescriptionError("No medical record found for this appointment.");
      return;
    }

    // Convert string fields to numbers where required
    const items = prescriptionItems.map((item) => ({
      medicineId: item.medicineId,
      dosage: item.dosage,
      dosageUnit: item.dosageUnit,
      frequency: item.frequency,
      durationDays: Number(item.durationDays),
      quantity: Number(item.quantity),
      instructions: item.instructions || undefined,
    }));

    const payload = {
      medicalRecordId,
      notes: prescriptionNotes || undefined,
      items,
    };

    try {
      setSubmittingPrescription(true);
      await api.post("/prescriptions", payload);
      setPrescriptionSuccess("Prescription created successfully!");
      setPrescribingForAppointmentId(null);
    } catch (err: any) {
      setPrescriptionError(
        err.response?.data?.message || "Failed to create prescription",
      );
    } finally {
      setSubmittingPrescription(false);
    }
  };

  // --- Render ---
  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Doctor Dashboard — Welcome, Dr.{" "}
            {user?.lastName || user?.firstName || "Doctor"}
          </h1>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Today's Appointments
          </h2>

          {loading && <p className="text-gray-500">Loading appointments...</p>}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!loading && !error && appointments.length === 0 && (
            <p className="text-gray-500">No appointments found.</p>
          )}

          {!loading &&
            !error &&
            appointments.map((appt: any) => (
              <div key={appt.id} className="border-b border-gray-200 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">
                      {appt.patient?.user?.firstName}{" "}
                      {appt.patient?.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(appt.scheduledAt).toLocaleDateString()} at{" "}
                      {new Date(appt.scheduledAt).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Department: {appt.department?.name || "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    {selectedAppointmentId !== appt.id &&
                      prescribingForAppointmentId !== appt.id && (
                        <>
                          <button
                            onClick={() => openMedicalForm(appt.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                          >
                            Create Medical Record
                          </button>
                          {appt.status === "CONFIRMED" && (
                            <button
                              onClick={() => markAsCompleted(appt.id)}
                              className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-purple-700 transition-colors"
                            >
                              Mark Completed
                            </button>
                          )}
                          {/* Show "Write Prescription" button if medical record exists */}
                          {medicalRecordMap[appt.id] && (
                            <button
                              onClick={() => openPrescriptionForm(appt.id)}
                              className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                            >
                              Write Prescription
                            </button>
                          )}
                        </>
                      )}
                  </div>
                </div>

                {/* Medical Record Form */}
                {selectedAppointmentId === appt.id && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                      New Medical Record
                    </h3>
                    {formError && (
                      <div className="bg-red-50 text-red-600 p-2 rounded text-sm mb-3">
                        {formError}
                      </div>
                    )}
                    {formSuccess && (
                      <div className="bg-green-50 text-green-600 p-2 rounded text-sm mb-3">
                        {formSuccess}
                      </div>
                    )}
                    <form onSubmit={handleMedicalSubmit} className="space-y-3">
                      {/* ... (medical record fields unchanged) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Chief Complaint *
                        </label>
                        <textarea
                          value={form.chiefComplaint}
                          onChange={(e) =>
                            handleMedicalFieldChange(
                              "chiefComplaint",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Blood Pressure
                          </label>
                          <input
                            type="text"
                            value={form.bloodPressure}
                            onChange={(e) =>
                              handleMedicalFieldChange(
                                "bloodPressure",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Pulse (bpm)
                          </label>
                          <input
                            type="number"
                            value={form.pulse}
                            onChange={(e) =>
                              handleMedicalFieldChange("pulse", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Temperature (°C)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={form.temperature}
                            onChange={(e) =>
                              handleMedicalFieldChange(
                                "temperature",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            SpO₂ (%)
                          </label>
                          <input
                            type="number"
                            value={form.spo2}
                            onChange={(e) =>
                              handleMedicalFieldChange("spo2", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Height (cm)
                          </label>
                          <input
                            type="number"
                            value={form.heightCm}
                            onChange={(e) =>
                              handleMedicalFieldChange(
                                "heightCm",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            value={form.weightKg}
                            onChange={(e) =>
                              handleMedicalFieldChange(
                                "weightKg",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Diagnosis
                        </label>
                        <input
                          type="text"
                          value={form.diagnosis}
                          onChange={(e) =>
                            handleMedicalFieldChange(
                              "diagnosis",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Treatment Plan
                        </label>
                        <textarea
                          value={form.treatmentPlan}
                          onChange={(e) =>
                            handleMedicalFieldChange(
                              "treatmentPlan",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Allergies
                        </label>
                        <input
                          type="text"
                          value={form.allergies}
                          onChange={(e) =>
                            handleMedicalFieldChange(
                              "allergies",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          {submitting ? "Saving..." : "Save Record"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAppointmentId(null)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Prescription Form */}
                {prescribingForAppointmentId === appt.id && (
                  <div className="mt-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                      Write Prescription
                    </h3>
                    {prescriptionError && (
                      <div className="bg-red-50 text-red-600 p-2 rounded text-sm mb-3">
                        {prescriptionError}
                      </div>
                    )}
                    {prescriptionSuccess && (
                      <div className="bg-green-50 text-green-600 p-2 rounded text-sm mb-3">
                        {prescriptionSuccess}
                      </div>
                    )}
                    <form
                      onSubmit={handlePrescriptionSubmit}
                      className="space-y-4"
                    >
                      {/* Dynamic items */}
                      {prescriptionItems.map((item, index) => (
                        <div
                          key={index}
                          className="border border-gray-300 rounded p-3 bg-white space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Item {index + 1}
                            </span>
                            {prescriptionItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePrescriptionItem(index)}
                                className="text-red-500 text-sm hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium">
                                Medicine
                              </label>
                              <select
                                value={item.medicineId}
                                onChange={(e) =>
                                  handlePrescriptionItemChange(
                                    index,
                                    "medicineId",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              >
                                <option value="">Select...</option>
                                {medicines.map((med: any) => (
                                  <option key={med.id} value={med.id}>
                                    {med.name} ({med.form})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium">
                                Dosage
                              </label>
                              <input
                                type="text"
                                value={item.dosage}
                                onChange={(e) =>
                                  handlePrescriptionItemChange(
                                    index,
                                    "dosage",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium">
                                Unit
                              </label>
                              <input
                                type="text"
                                value={item.dosageUnit}
                                onChange={(e) =>
                                  handlePrescriptionItemChange(
                                    index,
                                    "dosageUnit",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium">
                                Frequency
                              </label>
                              <select
                                value={item.frequency}
                                onChange={(e) =>
                                  handlePrescriptionItemChange(
                                    index,
                                    "frequency",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              >
                                <option value="OD">OD (Once daily)</option>
                                <option value="BD">BD (Twice daily)</option>
                                <option value="TDS">
                                  TDS (Three times daily)
                                </option>
                                <option value="QID">
                                  QID (Four times daily)
                                </option>
                                <option value="SOS">SOS (As needed)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium">
                                Duration (days)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.durationDays}
                                onChange={(e) =>
                                  handlePrescriptionItemChange(
                                    index,
                                    "durationDays",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handlePrescriptionItemChange(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium">
                                Instructions
                              </label>
                              <input
                                type="text"
                                value={item.instructions}
                                onChange={(e) =>
                                  handlePrescriptionItemChange(
                                    index,
                                    "instructions",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addPrescriptionItem}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        + Add another medicine
                      </button>
                      <div>
                        <label className="block text-sm font-medium">
                          Notes (optional)
                        </label>
                        <textarea
                          value={prescriptionNotes}
                          onChange={(e) => setPrescriptionNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={2}
                          placeholder="e.g., Take with food"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={submittingPrescription}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {submittingPrescription
                            ? "Saving..."
                            : "Submit Prescription"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrescribingForAppointmentId(null)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
