import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Invoice, InvoiceItemCategory } from '@medcore/shared-types';

export function useCreateInvoice() {
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await apiClient.post<Invoice>('/invoices', { appointmentId });
      return data;
    },
  });
}

export function useAddInvoiceItem() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      description,
      category,
      amount,
    }: {
      invoiceId: string;
      description: string;
      category: InvoiceItemCategory;
      amount: number;
    }) => {
      const { data } = await apiClient.post<Invoice>(`/invoices/${invoiceId}/items`, {
        description,
        category,
        amount,
      });
      return data;
    },
  });
}

export function useFinalizeInvoice() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await apiClient.patch<Invoice>(`/invoices/${invoiceId}/finalize`);
      return data;
    },
  });
}