import { describe, expect, it } from "vitest";
import {
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
});
