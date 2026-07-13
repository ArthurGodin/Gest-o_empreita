import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminClient } from "@/lib/supabase/admin";
import type { AsaasWebhookPayload } from "./types";
import { processSaasSubscriptionWebhook } from "./webhook-saas";

vi.mock("server-only", () => ({}));

const billingMocks = vi.hoisted(() => ({
  cancelSaasSubscription: vi.fn(),
  cancelSupersededSaasSubscriptions: vi.fn(),
  deactivateSaasPaymentLink: vi.fn(),
}));

vi.mock("@/lib/asaas/saas-billing", () => ({
  ...billingMocks,
  parseSaasPaymentLinkStorageId(value: string | null | undefined) {
    if (!value?.startsWith("PAYMENT_LINK:")) return null;
    const [id, encodedUrl] = value.slice("PAYMENT_LINK:".length).split(":", 2);
    return id && encodedUrl ? { id, url: "https://asaas.test/legacy" } : null;
  },
  saasPaymentLinkStorageLikePattern(paymentLinkId: string) {
    return `PAYMENT_LINK:${paymentLinkId}:%`;
  },
}));

type FakeCompany = {
  id: string;
  plan: string | null;
  saas_asaas_customer_id: string | null;
  saas_asaas_subscription_id: string | null;
  saas_asaas_subscription_plan: string | null;
  saas_pending_payment_link_id: string | null;
  saas_pending_payment_link_url: string | null;
  saas_pending_plan: string | null;
  saas_pending_checkout_token: string | null;
  saas_pending_checkout_started_at: string | null;
};

function company(
  input: Pick<FakeCompany, "id" | "plan"> & Partial<FakeCompany>,
): FakeCompany {
  return {
    saas_asaas_customer_id: null,
    saas_asaas_subscription_id: null,
    saas_asaas_subscription_plan: null,
    saas_pending_payment_link_id: null,
    saas_pending_payment_link_url: null,
    saas_pending_plan: null,
    saas_pending_checkout_token: null,
    saas_pending_checkout_started_at: null,
    ...input,
  };
}

function fakeAdmin(
  record: FakeCompany | null,
  options: { updateError?: { message: string; code?: string } } = {},
) {
  const updates: Array<Record<string, unknown>> = [];

  const admin = {
    from(table: string) {
      expect(table).toBe("companies");

      return {
        select() {
          const result = {
            eq() {
              return {
                maybeSingle: async () => ({ data: record, error: null }),
              };
            },
            like() {
              return {
                maybeSingle: async () => ({ data: record, error: null }),
              };
            },
          };
          return result;
        },
        update(patch: Record<string, unknown>) {
          updates.push(patch);
          return {
            eq: async () => ({ error: options.updateError ?? null }),
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

const PENDING_CLEAR = {
  saas_pending_payment_link_id: null,
  saas_pending_payment_link_url: null,
  saas_pending_plan: null,
  saas_pending_checkout_token: null,
  saas_pending_checkout_started_at: null,
};

describe("SaaS subscription webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates Ultimate from the Asaas external reference", async () => {
    const { admin, updates } = fakeAdmin(
      company({ id: "company-id", plan: "free" }),
    );

    const processed = await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_CONFIRMED", {
        subscription: "sub_123",
        externalReference: "SUB_ULTIMATE_company-id",
      }),
    );

    expect(processed).toBe(true);
    expect(updates).toEqual([
      {
        plan: "ultimate",
        saas_asaas_subscription_plan: "ultimate",
        saas_asaas_subscription_id: "sub_123",
        ...PENDING_CLEAR,
      },
    ]);
  });

  it("falls back to the stored target plan when the payment reference is absent", async () => {
    const { admin, updates } = fakeAdmin(
      company({
        id: "company-id",
        plan: "free",
        saas_asaas_subscription_plan: "pro",
      }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_RECEIVED", { subscription: "sub_123" }),
    );

    expect(updates[0]).toEqual({
      plan: "pro",
      saas_asaas_subscription_plan: "pro",
      saas_asaas_subscription_id: "sub_123",
      ...PENDING_CLEAR,
    });
  });

  it("activates Pro from a recurrent payment link and closes the link", async () => {
    const { admin, updates } = fakeAdmin(
      company({
        id: "company-id",
        plan: "free",
        saas_pending_payment_link_id: "paylink_123",
        saas_pending_payment_link_url: "https://asaas.test/link",
        saas_pending_plan: "pro",
      }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_CONFIRMED", {
        paymentLink: "paylink_123",
        subscription: "sub_123",
        externalReference: "SUB_PRO_company-id",
      }),
    );

    expect(billingMocks.deactivateSaasPaymentLink).toHaveBeenCalledWith(
      "paylink_123",
    );
    expect(updates[0]).toEqual({
      plan: "pro",
      saas_asaas_subscription_plan: "pro",
      saas_asaas_subscription_id: "sub_123",
      ...PENDING_CLEAR,
    });
  });

  it("cancels the old Pro subscription before activating an Ultimate upgrade", async () => {
    const { admin, updates } = fakeAdmin(
      company({
        id: "company-id",
        plan: "pro",
        saas_asaas_customer_id: "cus_123",
        saas_asaas_subscription_id: "sub_pro",
        saas_asaas_subscription_plan: "pro",
        saas_pending_payment_link_id: "link_ultimate",
        saas_pending_plan: "ultimate",
      }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_CONFIRMED", {
        subscription: "sub_ultimate",
        paymentLink: "link_ultimate",
        externalReference: "SUB_ULTIMATE_company-id",
      }),
    );

    expect(
      billingMocks.cancelSupersededSaasSubscriptions,
    ).toHaveBeenCalledWith({
      customerId: "cus_123",
      companyId: "company-id",
      keepSubscriptionId: "sub_ultimate",
      knownSubscriptionId: "sub_pro",
    });
    expect(updates[0]).toEqual({
      plan: "ultimate",
      saas_asaas_subscription_plan: "ultimate",
      saas_asaas_subscription_id: "sub_ultimate",
      ...PENDING_CLEAR,
    });
  });

  it("preserves Pro when an Ultimate checkout becomes overdue", async () => {
    const { admin, updates } = fakeAdmin(
      company({
        id: "company-id",
        plan: "pro",
        saas_asaas_subscription_id: "sub_pro",
        saas_asaas_subscription_plan: "pro",
        saas_pending_payment_link_id: "link_ultimate",
        saas_pending_plan: "ultimate",
      }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_OVERDUE", {
        subscription: "sub_ultimate_pending",
        paymentLink: "link_ultimate",
        externalReference: "SUB_ULTIMATE_company-id",
      }),
    );

    expect(billingMocks.cancelSaasSubscription).toHaveBeenCalledWith(
      "sub_ultimate_pending",
    );
    expect(billingMocks.deactivateSaasPaymentLink).toHaveBeenCalledWith(
      "link_ultimate",
    );
    expect(updates).toEqual([PENDING_CLEAR]);
  });

  it("ignores an overdue event from an old Pro subscription after Ultimate is active", async () => {
    const { admin, updates } = fakeAdmin(
      company({
        id: "company-id",
        plan: "ultimate",
        saas_asaas_subscription_id: "sub_ultimate",
        saas_asaas_subscription_plan: "ultimate",
      }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_OVERDUE", {
        subscription: "sub_old_pro",
        externalReference: "SUB_PRO_company-id",
      }),
    );

    expect(updates).toEqual([]);
  });

  it("keeps Ultimate and cancels a late paid Pro subscription", async () => {
    const { admin, updates } = fakeAdmin(
      company({
        id: "company-id",
        plan: "ultimate",
        saas_asaas_subscription_id: "sub_ultimate",
        saas_asaas_subscription_plan: "ultimate",
      }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_CONFIRMED", {
        subscription: "sub_old_pro",
        externalReference: "SUB_PRO_company-id",
      }),
    );

    expect(billingMocks.cancelSaasSubscription).toHaveBeenCalledWith(
      "sub_old_pro",
    );
    expect(updates).toEqual([]);
  });

  it("downgrades only when the invalid payment belongs to the active subscription", async () => {
    const { admin, updates } = fakeAdmin(
      company({
        id: "company-id",
        plan: "ultimate",
        saas_asaas_subscription_id: "sub_123",
        saas_asaas_subscription_plan: "ultimate",
      }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_OVERDUE", { subscription: "sub_123" }),
    );

    expect(updates).toEqual([
      {
        plan: "free",
        saas_asaas_subscription_id: null,
        saas_asaas_subscription_plan: null,
        ...PENDING_CLEAR,
      },
    ]);
  });

  it("does not activate a plan for non-paid subscription events", async () => {
    const { admin, updates } = fakeAdmin(
      company({ id: "company-id", plan: "free" }),
    );

    await processSaasSubscriptionWebhook(
      admin,
      paymentWebhook("PAYMENT_CREATED", {
        subscription: "sub_123",
        externalReference: "SUB_PRO_company-id",
      }),
    );

    expect(updates).toEqual([]);
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

  it("fails the webhook when plan activation cannot be persisted", async () => {
    const { admin } = fakeAdmin(
      company({ id: "company-id", plan: "free" }),
      { updateError: { message: "database unavailable", code: "08006" } },
    );

    await expect(
      processSaasSubscriptionWebhook(
        admin,
        paymentWebhook("PAYMENT_CONFIRMED", {
          subscription: "sub_123",
          externalReference: "SUB_PRO_company-id",
        }),
      ),
    ).rejects.toThrow("saas_subscription_activation_failed");
  });
});
