import { describe, expect, it, vi } from "vitest";
import type { AdminClient } from "@/lib/supabase/admin";
import type { AsaasWebhookPayload } from "./types";
import { processSaasSubscriptionWebhook } from "./webhook-saas";

vi.mock("server-only", () => ({}));

type FakeCompany = {
  id: string;
  plan: string | null;
  saas_asaas_subscription_plan?: string | null;
};

function fakeAdmin(company: FakeCompany | null) {
  const updates: Array<Record<string, unknown>> = [];

  const admin = {
    from(table: string) {
      expect(table).toBe("companies");

      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: company,
                  error: null,
                }),
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          updates.push(patch);

          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    },
  } as unknown as AdminClient;

  return { admin, updates };
}

function paymentWebhook(
  event: string,
  payment: NonNullable<AsaasWebhookPayload["payment"]>,
): AsaasWebhookPayload {
  return { event, payment };
}

describe("SaaS subscription webhook", () => {
  it("activates Ultimate from the Asaas external reference", async () => {
    const { admin, updates } = fakeAdmin({
      id: "company-id",
      plan: "free",
      saas_asaas_subscription_plan: "pro",
    });

    const processed = await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_CONFIRMED", {
        subscription: "sub_123",
        externalReference: "SUB_ULTIMATE_company-id",
      }),
    );

    expect(processed).toBe(true);
    expect(updates).toEqual([{ plan: "ultimate" }]);
  });

  it("falls back to the stored target plan when the payment reference is absent", async () => {
    const { admin, updates } = fakeAdmin({
      id: "company-id",
      plan: "free",
      saas_asaas_subscription_plan: "pro",
    });

    const processed = await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_RECEIVED", {
        subscription: "sub_123",
      }),
    );

    expect(processed).toBe(true);
    expect(updates).toEqual([{ plan: "pro" }]);
  });

  it("downgrades to Free when the SaaS subscription payment is no longer valid", async () => {
    const { admin, updates } = fakeAdmin({
      id: "company-id",
      plan: "ultimate",
      saas_asaas_subscription_plan: "ultimate",
    });

    const processed = await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_OVERDUE", {
        subscription: "sub_123",
      }),
    );

    expect(processed).toBe(true);
    expect(updates).toEqual([{ plan: "free" }]);
  });

  it("ignores payloads that are not SaaS subscription payments", async () => {
    const { admin, updates } = fakeAdmin(null);

    await expect(
      processSaasSubscriptionWebhook(
        admin,
        paymentWebhook("PAYMENT_CONFIRMED", {
          externalReference: "billing-charge-id",
        }),
      ),
    ).resolves.toBe(false);

    expect(updates).toEqual([]);
  });
});
