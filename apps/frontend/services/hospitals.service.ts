import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Hospital, HospitalStats } from '@medcore/shared-types';

export function useHospitals() {
  return useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const { data } = await apiClient.get<Hospital[]>('/hospitals');
      return data;
    },
  });
}

export function useHospitalStats() {
  return useQuery({
    queryKey: ['hospitals', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<HospitalStats>('/hospitals/stats');
      return data;
    },
  });
}