import { describe, expect, it } from "vitest";
import {
  createProductEventId,
  isProductEventId,
  metaEventForProductEvent,
} from "./meta-events";
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

describe("conversion Meta events", () => {
  it("maps only completed signup, not form submission, to Lead", () => {
    expect(
      metaEventForProductEvent("signup_completed", {}),
    ).toMatchObject({
      eventName: "Lead",
    });
    expect(
      metaEventForProductEvent("signup_form_submitted", {}),
    ).toBeNull();
  });

  it("does not count simulated or reused checkout as a new conversion", () => {
    expect(
      metaEventForProductEvent("saas_checkout_generated", {
        plan: "pro",
        simulated: true,
      }),
    ).toBeNull();
    expect(
      metaEventForProductEvent("saas_checkout_generated", {
        plan: "pro",
        reused: true,
      }),
    ).toBeNull();
    expect(
      metaEventForProductEvent("saas_checkout_generated", {
        plan: "pro",
        simulated: false,
        reused: false,
      }),
    ).toMatchObject({
      eventName: "AddPaymentInfo",
      customData: {
        currency: "BRL",
        value: 97,
      },
    });
  });

  it("creates URL-safe occurrence identifiers and validates external input", () => {
    const eventId = createProductEventId("onboarding_completed");

    expect(eventId).toMatch(/^onboarding_completed-[A-Za-z0-9_-]+$/);
    expect(isProductEventId(eventId)).toBe(true);
    expect(isProductEventId("unsafe event id")).toBe(false);
    expect(isProductEventId("x".repeat(161))).toBe(false);
  });
});
