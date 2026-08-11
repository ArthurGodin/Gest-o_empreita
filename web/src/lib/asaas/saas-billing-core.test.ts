import { describe, expect, it } from "vitest";
import {
  buildSaasPaymentLinkPayload,
  findReusableCheckoutPayment,
  hasPaidSubscriptionPayment,
  isSubscriptionInactive,
} from "./saas-billing-core";

describe("SaaS billing core", () => {
  it("reuses an open checkout payment before creating another subscription", () => {
    const payment = findReusableCheckoutPayment([
      {
        id: "paid",
        status: "RECEIVED",
        invoiceUrl: "https://asaas.test/paid",
      },
      {
        id: "pending",
        status: "PENDING",
        invoiceUrl: "https://asaas.test/pending",
      },
    ]);

    expect(payment?.id).toBe("pending");
  });

  it("detects paid subscription payments", () => {
    expect(
      hasPaidSubscriptionPayment([
        { id: "pending", status: "PENDING", invoiceUrl: "https://asaas.test" },
      ]),
    ).toBe(false);

    expect(
      hasPaidSubscriptionPayment([
        { id: "received", status: "RECEIVED", invoiceUrl: "https://asaas.test" },
      ]),
    ).toBe(true);
  });

  it("treats deleted or inactive subscriptions as inactive", () => {
    expect(isSubscriptionInactive({ id: "sub", status: "ACTIVE" })).toBe(false);
    expect(isSubscriptionInactive({ id: "sub", status: "INACTIVE" })).toBe(true);
    expect(isSubscriptionInactive({ id: "sub", deleted: true })).toBe(true);
  });

  it("builds a recurring Asaas payment link without choosing boleto upfront", () => {
    const payload = buildSaasPaymentLinkPayload({
      plan: "pro",
      companyId: "company_123",
      companyName: "Prumo QA",
    });

    expect(payload).toEqual({
      name: "Prumo - Plano Pro",
      description: "Assinatura mensal do Plano Pro para Prumo QA.",
      billingType: "UNDEFINED",
      chargeType: "RECURRENT",
      subscriptionCycle: "MONTHLY",
      value: 97,
      dueDateLimitDays: 3,
      externalReference: "SUB_PRO_company_123",
      isAddressRequired: false,
    });
    expect(payload).not.toHaveProperty("customer");
    expect(payload).not.toHaveProperty("billingType", "BOLETO");
  });

  it("uses the correct Ultimate value in the recurring payment link", () => {
    expect(
      buildSaasPaymentLinkPayload({
        plan: "ultimate",
        companyId: "company_456",
        companyName: "Prumo QA",
      }),
    ).toMatchObject({
      name: "Prumo - Plano Ultimate",
      value: 247,
      externalReference: "SUB_ULTIMATE_company_456",
    });
  });
});
