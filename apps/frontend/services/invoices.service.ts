import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Invoice,
  InvoiceItemCategory,
  InvoiceWithPatient,
  SuggestedCharge,
} from "@medcore/shared-types";

export function useCreateInvoice() {
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await apiClient.post<Invoice>("/invoices", {
        appointmentId,
      });
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
      const { data } = await apiClient.post<Invoice>(
        `/invoices/${invoiceId}/items`,
        {
          description,
          category,
          amount,
        },
      );
      return data;
    },
  });
}

export function useFinalizeInvoice() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await apiClient.patch<Invoice>(
        `/invoices/${invoiceId}/finalize`,
      );
      return data;
    },
  });
}

export function usePendingInvoices() {
  return useQuery({
    queryKey: ["invoices", "finalized"],
    queryFn: async () => {
      const { data } = await apiClient.get<InvoiceWithPatient[]>("/invoices");
      return data;
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await apiClient.patch<Invoice>(
        `/invoices/${invoiceId}/mark-paid`,
      );
      return data;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["invoices", "finalized"] }),
  });
}

export function useSuggestedCharges(appointmentId: string | null) {
  return useQuery({
    queryKey: ["invoices", "suggested-charges", appointmentId],
    queryFn: async () => {
      const { data } = await apiClient.get<SuggestedCharge[]>(
        `/invoices/suggested-charges/${appointmentId}`,
      );
      return data;
    },
    enabled: !!appointmentId,
  });
}

export function useMyInvoices() {
  return useQuery({
    queryKey: ["invoices", "mine"],
    queryFn: async () => {
      const { data } = await apiClient.get<Invoice[]>("/invoices/me");
      return data;
    },
  });
}
