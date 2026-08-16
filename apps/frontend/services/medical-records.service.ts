import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MedicalRecord, CreateMedicalRecordRequest } from '@medcore/shared-types';

export function useCreateMedicalRecord() {
  return useMutation({
    mutationFn: async (payload: CreateMedicalRecordRequest) => {
      const { data } = await apiClient.post<MedicalRecord>('/medical-records', payload);
      return data;
    },
  });
}