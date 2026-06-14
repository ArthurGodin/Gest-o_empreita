export const PRODUCT_EVENT_NAMES = [
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
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export function isProductEventName(value: unknown): value is ProductEventName {
  return (
    typeof value === "string" &&
    PRODUCT_EVENT_NAMES.includes(value as ProductEventName)
  );
}
