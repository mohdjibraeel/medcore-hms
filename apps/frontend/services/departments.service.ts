import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Department } from '@medcore/shared-types';


export function useDepartments(hospitalId: string | null) {
  return useQuery({
    queryKey: ['departments', hospitalId],
    queryFn: async () => {
      const { data } = await apiClient.get<Department[]>('/departments', {
        params: hospitalId ? { hospitalId } : undefined,
      });
      return data;
    },
    enabled: !!hospitalId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; hospitalId: string }) => {
      const { data } = await apiClient.post<Department>('/departments', payload);
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}