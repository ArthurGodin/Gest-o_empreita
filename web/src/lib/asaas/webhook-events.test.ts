import { describe, expect, it } from "vitest";
import {
  buildBillingChargeWebhookPatch,
  chargeStatusForAsaasEvent,
  safePaymentExternalReference,
  shouldApplyChargeStatus,
} from "./webhook-events";

describe("Asaas billing webhook event reconciliation", () => {
  it("maps Asaas payment events to local charge statuses", () => {
    expect(chargeStatusForAsaasEvent("PAYMENT_RECEIVED")).toBe("received");
    expect(chargeStatusForAsaasEvent("PAYMENT_CONFIRMED")).toBe("confirmed");
    expect(chargeStatusForAsaasEvent("PAYMENT_OVERDUE")).toBe("overdue");
    expect(chargeStatusForAsaasEvent("PAYMENT_DELETED")).toBe("cancelled");
    expect(chargeStatusForAsaasEvent("PAYMENT_CREATED")).toBeNull();
  });

  it("prevents late non-paid events from downgrading a paid charge", () => {
    expect(shouldApplyChargeStatus("received", "overdue")).toBe(false);
    expect(shouldApplyChargeStatus("received", "cancelled")).toBe(false);
    expect(shouldApplyChargeStatus("confirmed", "overdue")).toBe(false);
    expect(shouldApplyChargeStatus("confirmed", "cancelled")).toBe(false);
  });

  it("allows a confirmed charge to evolve to received", () => {
    expect(shouldApplyChargeStatus("confirmed", "received")).toBe(true);
  });

  it("sets paid_at from the payment date only once", () => {
    expect(
      buildBillingChargeWebhookPatch({
        eventType: "PAYMENT_CONFIRMED",
        payload: {
          event: "PAYMENT_CONFIRMED",
          payment: {
            paymentDate: "2026-06-11",
            invoiceUrl: "https://sandbox.asaas.com/i/pay_test",
          },
        },
        current: { status: "pending", paid_at: null },
      }),
    ).toEqual({
      status: "confirmed",
      paid_at: "2026-06-11T00:00:00-03:00",
      invoice_url: "https://sandbox.asaas.com/i/pay_test",
    });

    expect(
      buildBillingChargeWebhookPatch({
        eventType: "PAYMENT_RECEIVED",
        payload: {
          event: "PAYMENT_RECEIVED",
          payment: { clientPaymentDate: "2026-06-12" },
        },
        current: {
          status: "confirmed",
          paid_at: "2026-06-11T00:00:00-03:00",
        },
      }),
    ).toEqual({ status: "received" });
  });

  it("keeps invoice updates even when status transition is ignored", () => {
    expect(
      buildBillingChargeWebhookPatch({
        eventType: "PAYMENT_OVERDUE",
        payload: {
          event: "PAYMENT_OVERDUE",
          payment: { invoiceUrl: "https://sandbox.asaas.com/i/new_invoice" },
        },
        current: {
          status: "received",
          paid_at: "2026-06-11T00:00:00-03:00",
        },
      }),
    ).toEqual({ invoice_url: "https://sandbox.asaas.com/i/new_invoice" });
  });

  it("accepts only UUID-like external references for charge lookup fallback", () => {
    expect(
      safePaymentExternalReference({
        payment: {
          externalReference: "  fe66f8d3-90a2-4648-a5cf-064a3b07a903  ",
        },
      }),
    ).toBe("fe66f8d3-90a2-4648-a5cf-064a3b07a903");

    expect(
      safePaymentExternalReference({
        payment: { externalReference: "billing_charges;drop table" },
      }),
    ).toBeNull();
    expect(safePaymentExternalReference({ payment: {} })).toBeNull();
  });
});
