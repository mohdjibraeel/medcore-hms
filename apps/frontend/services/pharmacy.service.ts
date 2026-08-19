import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Medicine, DispenseMedicineRequest } from '@medcore/shared-types';
import type { CreateMedicineRequest } from '@medcore/shared-types';

export function useMedicines(hospitalId: string | null) {
  return useQuery({
    queryKey: ['medicines', hospitalId],
    queryFn: async () => {
      const { data } = await apiClient.get<Medicine[]>('/medicines', {
        params: hospitalId ? { hospitalId } : undefined,
      });
      return data;
    },
    enabled: !!hospitalId,
  });
}

export function useDispenseMedicine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DispenseMedicineRequest) => {
      const { data } = await apiClient.post('/dispense', payload);
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}


export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMedicineRequest) => {
      const { data } = await apiClient.post<Medicine>('/medicines', payload);
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['medicines'] }),
  });
}

import type { CreateMedicineBatchRequest } from '@medcore/shared-types';

export function useCreateMedicineBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMedicineBatchRequest) => {
      const { data } = await apiClient.post('/medicine-batches', payload);
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['medicines'] }),
  });
}