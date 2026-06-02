import "server-only";

import { asaasRequest } from "@/lib/asaas/client";
import type { AsaasCustomer, AsaasCustomerInput } from "@/lib/asaas/types";

export async function createAsaasCustomer(
  input: AsaasCustomerInput,
): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: {
      name: input.name,
      cpfCnpj: input.cpfCnpj,
      email: input.email || undefined,
      mobilePhone: onlyDigits(input.mobilePhone),
      externalReference: input.externalReference,
    },
  });
}

function onlyDigits(value: string | null | undefined): string | undefined {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || undefined;
}
