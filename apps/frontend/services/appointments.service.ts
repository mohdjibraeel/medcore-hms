import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import type { AppointmentForPatient, AppointmentForToday } from "@medcore/shared-types";
import type {
  AvailabilityResponse,
  Appointment,
  AppointmentWithDetails,
  CreateAppointmentRequest,
  AppointmentStatus,
} from "@medcore/shared-types";

export function useAvailability(doctorId: string | null, date: string | null) {
  return useQuery({
    queryKey: ["availability", doctorId, date],
    queryFn: async () => {
      const { data } = await apiClient.get<AvailabilityResponse>(
        "/appointments/availability",
        {
          params: { doctorId, date },
        },
      );
      return data;
    },
    enabled: !!doctorId && !!date,
  });
}

// Generic so the Patient page can request AppointmentWithDetails (has `doctor`)
// and the Doctor page can request AppointmentWithPatientDetails (has `patient`)
// from the exact same backend route — the shape just depends on who's asking.
export function useMyAppointments<T = AppointmentWithDetails>() {
  return useQuery({
    queryKey: ["appointments", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get<T[]>("/appointments/me");
      return data;
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: AppointmentStatus;
    }) => {
      const { data } = await apiClient.patch<Appointment>(
        `/appointments/${id}/status`,
        { status },
      );
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "me"] });
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAppointmentRequest) => {
      const { data } = await apiClient.post<Appointment>(
        "/appointments",
        payload,
      );
      return data;
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["availability", variables.doctorId],
      });
      queryClient.invalidateQueries({ queryKey: ["appointments", "me"] });
    },
  });
}

export function useAppointmentsByPatient(patientId: string | null) {
  return useQuery({
    queryKey: ["appointments", "by-patient", patientId],
    queryFn: async () => {
      const { data } = await apiClient.get<AppointmentForPatient[]>(
        `/appointments/by-patient/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: async () => {
      const { data } = await apiClient.get<AppointmentForToday[]>('/appointments/today');
      return data;
    },
  });
}
