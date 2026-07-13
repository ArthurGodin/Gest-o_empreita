export const PRODUCT_EVENT_NAMES = [
  "signup_form_submitted",
  "signup_failed",
  "marketing_cta_clicked",
  "pricing_plan_clicked",
  "onboarding_submitted",
  "onboarding_completed",
  "onboarding_failed",
  "saas_checkout_started",
  "saas_checkout_generated",
  "saas_checkout_failed",
  "saas_checkout_simulated_activated",
  "app_error_boundary",
  "global_error_boundary",
  "quote_created",
  "quote_send_prepared",
  "quote_whatsapp_opened",
  "quote_whatsapp_message_copied",
  "quote_public_link_copied",
  "quote_public_link_regenerated",
  "quote_pdf_clicked",
  "quote_contact_whatsapp_clicked",
  "quote_approval_started",
  "quote_approved",
  "quote_revision_started",
  "quote_revision_requested",
  "project_created_from_quote",
  "billing_pix_generated",
  "pix_copied",
  "demo_kit_prepared",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export function isProductEventName(value: unknown): value is ProductEventName {
  return (
    typeof value === "string" &&
    PRODUCT_EVENT_NAMES.includes(value as ProductEventName)
  );
}
