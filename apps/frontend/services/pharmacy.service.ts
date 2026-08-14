import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Medicine, DispenseMedicineRequest } from '@medcore/shared-types';

export function useMedicines() {
  return useQuery({
    queryKey: ['medicines'],
    queryFn: async () => {
      const { data } = await apiClient.get<Medicine[]>('/medicines');
      return data;
    },
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
      // Dispensing changes both what's still pending and how much stock
      // remains in the batch it was pulled from — refresh both views.
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}