import { useMutation, useQuery } from '@tanstack/react-query';
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

export function useMedicalRecordByAppointment(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['medical-record', 'by-appointment', appointmentId],
    queryFn: async () => {
      const { data } = await apiClient.get<MedicalRecord | null>(
        `/medical-records/by-appointment/${appointmentId}`,
      );
      return data;
    },
    enabled: !!appointmentId,
  });
}