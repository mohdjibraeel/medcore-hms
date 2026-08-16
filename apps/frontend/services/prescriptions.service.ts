import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PendingPrescriptionItem, CreatePrescriptionRequest } from '@medcore/shared-types';

export function usePendingPrescriptions() {
  return useQuery({
    queryKey: ['prescriptions', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<PendingPrescriptionItem[]>('/prescriptions/pending');
      return data;
    },
  });
}

export function useCreatePrescription() {
  return useMutation({
    mutationFn: async (payload: CreatePrescriptionRequest) => {
      const { data } = await apiClient.post('/prescriptions', payload);
      return data;
    },
  });
}