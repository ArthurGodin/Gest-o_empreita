import "server-only";

import { asaasRequest } from "@/lib/asaas/client";
import type {
  AsaasPayment,
  AsaasPaymentInput,
  AsaasPixQrCode,
} from "@/lib/asaas/types";

export async function createPixPayment(
  input: AsaasPaymentInput,
): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: {
      customer: input.customer,
      billingType: "PIX",
      value: centsToDecimal(input.valueCents),
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    },
  });
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

function centsToDecimal(cents: number): number {
  return Number((cents / 100).toFixed(2));
}
