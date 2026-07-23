export const PRODUCT_EVENT_NAMES = [
  "signup_form_submitted",
  "signup_failed",
  "marketing_cta_clicked",
  "pricing_plan_clicked",
  "onboarding_submitted",
  "onboarding_completed",
  "onboarding_failed",
  "business_segment_changed",
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
  "deliverable_created",
  "deliverable_version_created",
  "deliverable_upload_started",
  "deliverable_upload_completed",
  "deliverable_upload_failed",
  "deliverable_published",
  "deliverable_public_opened",
  "deliverable_approved",
  "deliverable_changes_requested",
  "deliverable_quota_blocked",
  "project_delivery_accepted",
  "billing_pix_generated",
  "pix_copied",
  "demo_kit_prepared",
  "help_center_opened",
  "help_topic_opened",
  "help_search_used",
  "support_email_clicked",
  "pendency_center_opened",
  "pendency_clicked",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export function isProductEventName(value: unknown): value is ProductEventName {
  return (
    typeof value === "string" &&
    PRODUCT_EVENT_NAMES.includes(value as ProductEventName)
  );
}
