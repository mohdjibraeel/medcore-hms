import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PatientSearchResult } from '@medcore/shared-types';

export function usePatientSearch(search: string) {
  return useQuery({
    queryKey: ['patients', 'search', search],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientSearchResult[]>('/patients', {
        params: search ? { search } : undefined,
      });
      return data;
    },
  });
}