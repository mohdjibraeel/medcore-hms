import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
}

export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await apiClient.post<CreateOrderResponse>('/payments/create-order', { invoiceId });
      return data;
    },
  });
}