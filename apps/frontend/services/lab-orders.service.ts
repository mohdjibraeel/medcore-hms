import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { LabOrderQueueItem } from '@medcore/shared-types';

export function useLabOrderQueue() {
  return useQuery({
    queryKey: ['lab-orders', 'queue'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabOrderQueueItem[]>('/lab-orders/queue');
      return data;
    },
  });
}

function useLabOrderMutation() {
  const queryClient = useQueryClient();
  return { queryClient };
}

export function useCollectSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/lab-orders/${id}/collect`);
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lab-orders', 'queue'] }),
  });
}

export function useUploadResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: string;
      items: { labOrderItemId: string; resultValue: number }[];
    }) => {
      const { data } = await apiClient.patch(`/lab-orders/${id}/result`, { items });
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lab-orders', 'queue'] }),
  });
}

export function useApproveLabOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/lab-orders/${id}/approve`);
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lab-orders', 'queue'] }),
  });
}