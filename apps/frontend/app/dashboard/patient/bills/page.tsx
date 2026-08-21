"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMyInvoices } from "@/services/invoices.service";
import { useCreatePaymentOrder } from "@/services/payments.service";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { InvoiceStatus } from "@medcore/shared-types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: "bg-zinc-100 text-zinc-500",
  [InvoiceStatus.FINALIZED]: "bg-amber-50 text-amber-700",
  [InvoiceStatus.PAID]: "bg-green-50 text-green-700",
};

export default function BillsPage() {
  const { data: invoices, isLoading } = useMyInvoices();
  const createOrder = useCreatePaymentOrder();
  const queryClient = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);

  const handlePay = async (invoiceId: string, amount: number) => {
    setError(null);
    setPayingId(invoiceId);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError(
          "Could not load the payment gateway. Check your connection and try again.",
        );
        setPayingId(null);
        return;
      }

      const order = await createOrder.mutateAsync(invoiceId);

      const razorpay = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "MedCore HMS",
        description: "Invoice Payment",
        handler: () => {
          // Payment succeeded on Razorpay's side. The invoice's actual
          // status flips to PAID via the server-side webhook — that's the
          // source of truth, not this client callback — so we just poll
          // briefly and refresh once it lands.
          setPendingConfirmId(invoiceId);
          setPayingId(null);
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["invoices", "mine"] });
          }, 3000);
        },
        modal: {
          ondismiss: () => setPayingId(null),
        },
      });

      razorpay.open();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong starting payment.",
      );
      setPayingId(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">My Bills</h1>
      <p className="mt-1 text-sm text-zinc-500">Invoices from your visits.</p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
        {invoices?.length === 0 && (
          <p className="text-sm text-zinc-500">No invoices yet.</p>
        )}

        {invoices?.map((invoice) => (
          <div
            key={invoice.id}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-zinc-500">
                  {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </div>
                <div className="mt-1 text-lg font-semibold text-zinc-900">
                  ₹{invoice.totalAmount.toFixed(2)}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
              >
                {invoice.status}
              </span>
            </div>

            {invoice.items && invoice.items.length > 0 && (
              <div className="mt-3 divide-y divide-zinc-100 border-t border-zinc-100 pt-2">
                {invoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between py-1 text-sm text-zinc-600"
                  >
                    <span>{item.description}</span>
                    <span>₹{item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {invoice.status === InvoiceStatus.FINALIZED && (
              <div className="mt-3">
                {pendingConfirmId === invoice.id ? (
                  <p className="text-sm text-amber-600">
                    Payment received — confirming...
                  </p>
                ) : (
                  <Button
                    size="sm"
                    disabled={payingId === invoice.id}
                    onClick={() => handlePay(invoice.id, invoice.totalAmount)}
                  >
                    {payingId === invoice.id ? "Opening payment..." : "Pay Now"}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
