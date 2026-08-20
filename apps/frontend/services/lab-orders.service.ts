import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { LabOrderQueueItem, LabTest, CreateLabOrderRequest, LabOrderDetail,CreateLabTestRequest } from '@medcore/shared-types';

export function useLabOrderQueue() {
  return useQuery({
    queryKey: ['lab-orders', 'queue'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabOrderQueueItem[]>('/lab-orders/queue');
      return data;
    },
  });
}

export function useLabTests() {
  return useQuery({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabTest[]>('/lab-orders/tests');
      return data;
    },
  });
}

export function useCreateLabOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLabOrderRequest) => {
      const { data } = await apiClient.post('/lab-orders', payload);
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lab-orders'] }),
  });
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

export function useLabOrdersByMedicalRecord(medicalRecordId: string | null) {
  return useQuery({
    queryKey: ['lab-orders', 'by-medical-record', medicalRecordId],
    queryFn: async () => {
      const { data } = await apiClient.get<LabOrderDetail[]>(
        `/lab-orders/by-medical-record/${medicalRecordId}`,
      );
      return data;
    },
    enabled: !!medicalRecordId,
    // Keep polling every 5s while any order isn't fully approved yet;
    // stop automatically once results are in, so we're not polling forever.
    refetchInterval: (query) => {
      const orders = query.state.data;
      if (!orders || orders.length === 0) return false;
      const allApproved = orders.every((o) => o.status === 'APPROVED');
      return allApproved ? false : 5000;
    },
  });
}

export function useCreateLabTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLabTestRequest) => {
      const { data } = await apiClient.post<LabTest>('/lab-orders/tests', payload);
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lab-tests'] }),
  });
}