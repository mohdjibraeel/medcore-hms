import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Doctor } from '@medcore/shared-types';

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