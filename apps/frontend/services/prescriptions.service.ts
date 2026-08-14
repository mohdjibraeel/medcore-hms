import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PendingPrescriptionItem } from '@medcore/shared-types';

export function usePendingPrescriptions() {
  return useQuery({
    queryKey: ['prescriptions', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<PendingPrescriptionItem[]>('/prescriptions/pending');
      return data;
    },
  });
}