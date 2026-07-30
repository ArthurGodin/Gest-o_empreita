"use client";

import { track } from "@vercel/analytics";
import { hasGrantedMarketingConsent } from "@/lib/marketing-consent";
import {
  createProductEventId,
  isProductEventId,
  metaEventForProductEvent,
} from "@/lib/meta-events";
import type { ProductEventName } from "./product-event-names";

type ProductEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;
type CompactProductEventProperties = Record<
  string,
  string | number | boolean | null
>;

export type { ProductEventName };

interface ProductEventOptions {
  eventId?: string;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackProductEvent(
  name: ProductEventName,
  properties: ProductEventProperties = {},
  options: ProductEventOptions = {},
) {
  const compacted = compactProperties(properties);
  const eventId = isProductEventId(options.eventId)
    ? options.eventId
    : createProductEventId(name);

  try {
    track(name, compacted);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] event dropped", name, error);
    }
  }

  trackMetaPixelEvent(name, compacted, eventId);
}

function compactProperties(
  properties: ProductEventProperties,
): CompactProductEventProperties {
  const compacted: CompactProductEventProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) compacted[key] = value;
  }

  return compacted;
}

function trackMetaPixelEvent(
  name: ProductEventName,
  properties: Record<string, string | number | boolean | null>,
  eventId: string,
) {
  const metaEvent = metaEventForProductEvent(name, properties);
  if (
    !metaEvent ||
    typeof document === "undefined" ||
    !hasGrantedMarketingConsent(document.cookie) ||
    typeof window.fbq !== "function"
  ) {
    return;
  }

  try {
    window.fbq("track", metaEvent.eventName, metaEvent.customData, {
      eventID: eventId,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[meta] pixel event dropped", name, error);
    }
  }
}
