import { PLAN_DEFINITIONS, normalizePaidPlan } from "@/lib/plans";
import type { ProductEventName } from "@/lib/product-event-names";

type ProductEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export type MetaStandardEventName =
  | "AddPaymentInfo"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Lead";

export interface MetaEvent {
  eventName: MetaStandardEventName;
  customData: Record<string, string | number | boolean>;
}

export function metaEventForProductEvent(
  name: ProductEventName,
  properties: ProductEventProperties = {},
): MetaEvent | null {
  const plan = typeof properties.plan === "string"
    ? normalizePaidPlan(properties.plan)
    : null;

  switch (name) {
    case "signup_form_submitted":
      return {
        eventName: "Lead",
        customData: {
          content_name: "signup_form",
          funnel_step: "signup_submit",
        },
      };

    case "onboarding_completed":
      return {
        eventName: "CompleteRegistration",
        customData: {
          content_name: "onboarding",
          funnel_step: "activation",
        },
      };

    case "saas_checkout_started":
      return paidPlanEvent("InitiateCheckout", plan, "checkout_start");

    case "saas_checkout_generated":
      return paidPlanEvent("AddPaymentInfo", plan, "checkout_link_generated");

    default:
      return null;
  }
}

function paidPlanEvent(
  eventName: MetaStandardEventName,
  plan: "pro" | "ultimate" | null,
  funnelStep: string,
): MetaEvent {
  const definition = plan ? PLAN_DEFINITIONS[plan] : null;

  return {
    eventName,
    customData: {
      currency: "BRL",
      value: definition ? definition.priceCents / 100 : 0,
      content_name: definition?.label ?? "Plano pago",
      content_category: "subscription",
      funnel_step: funnelStep,
    },
  };
}
