import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Hospital } from '@medcore/shared-types';

export function useHospitals() {
  return useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const { data } = await apiClient.get<Hospital[]>('/hospitals');
      return data;
    },
  });
}