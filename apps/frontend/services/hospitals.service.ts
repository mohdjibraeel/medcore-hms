import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Hospital,
  HospitalStats,
  PlatformStats,
} from "@medcore/shared-types";

export function useHospitals() {
  return useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data } = await apiClient.get<Hospital[]>("/hospitals");
      return data;
    },
  });
}

export function useHospitalStats() {
  return useQuery({
    queryKey: ["hospitals", "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<HospitalStats>("/hospitals/stats");
      return data;
    },
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["hospitals", "platform-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformStats>(
        "/hospitals/platform-stats",
      );
      return data;
    },
  });
}

export function useCreateHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; slug: string }) => {
      const { data } = await apiClient.post<Hospital>("/hospitals", payload);
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({
        queryKey: ["hospitals", "platform-stats"],
      });
    },
  });
}

export function useUpdateHospitalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "VERIFIED" | "REJECTED";
    }) => {
      const { data } = await apiClient.patch<Hospital>(
        `/hospitals/${id}/status`,
        { status },
      );
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({
        queryKey: ["hospitals", "platform-stats"],
      });
    },
  });
}

export function useCreateHospitalAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hospitalId,
      email,
      password,
      firstName,
      lastName,
    }: {
      hospitalId: string;
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
    }) => {
      const { data } = await apiClient.post(`/hospitals/${hospitalId}/admin`, {
        email,
        password,
        firstName,
        lastName,
      });
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    },
  });
}

export function useUpdateHospitalAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hospitalId,
      email,
      password,
      firstName,
      lastName,
    }: {
      hospitalId: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    }) => {
      const { data } = await apiClient.patch(`/hospitals/${hospitalId}/admin`, {
        email,
        password,
        firstName,
        lastName,
      });
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    },
  });
}
