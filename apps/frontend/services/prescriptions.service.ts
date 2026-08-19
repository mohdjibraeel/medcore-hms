import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PendingPrescriptionItem, CreatePrescriptionRequest, Prescription } from '@medcore/shared-types';

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
      const { data } = await apiClient.post<Prescription>('/prescriptions', payload);
      return data;
    },
  });
}

export function usePrescriptionByMedicalRecord(medicalRecordId: string | null) {
  return useQuery({
    queryKey: ['prescriptions', 'by-medical-record', medicalRecordId],
    queryFn: async () => {
      const { data } = await apiClient.get<Prescription | null>(
        `/prescriptions/by-medical-record/${medicalRecordId}`,
      );
      return data;
    },
    enabled: !!medicalRecordId,
  });
}