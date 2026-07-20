import { describe, expect, it } from "vitest";
import { metaEventForProductEvent } from "./meta-events";
import type { ProductEventName } from "./product-event-names";

describe("help center Meta events", () => {
  it.each<ProductEventName>([
    "help_center_opened",
    "help_topic_opened",
    "help_search_used",
    "support_email_clicked",
  ])("does not map %s to a Meta conversion", (eventName) => {
    expect(metaEventForProductEvent(eventName, {})).toBeNull();
  });
});

describe("pendency Meta events", () => {
  it.each<ProductEventName>([
    "pendency_center_opened",
    "pendency_clicked",
  ])("does not map %s to a Meta conversion", (eventName) => {
    expect(metaEventForProductEvent(eventName, {})).toBeNull();
  });
});
