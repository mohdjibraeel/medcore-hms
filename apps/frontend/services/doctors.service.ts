import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Doctor, CreateDoctorRequest } from '@medcore/shared-types';

export function useDoctors(hospitalId: string | null) {
  return useQuery({
    queryKey: ['doctors', hospitalId],
    queryFn: async () => {
      const { data } = await apiClient.get<Doctor[]>('/doctors', {
        params: hospitalId ? { hospitalId } : undefined,
      });
      return data;
    },
    enabled: !!hospitalId,
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDoctorRequest) => {
      const { data } = await apiClient.post<Doctor>('/doctors', payload);
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}