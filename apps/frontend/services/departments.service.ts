import { useQuery } from '@tanstack/react-query';
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