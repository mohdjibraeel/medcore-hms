import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StaffMember, CreateStaffRequest } from '@medcore/shared-types';

export function useStaffList(role?: string) {
  return useQuery({
    queryKey: ['staff', role ?? 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<StaffMember[]>('/staff', {
        params: role ? { role } : undefined,
      });
      return data;
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateStaffRequest) => {
      const { data } = await apiClient.post<StaffMember>('/staff', payload);
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}