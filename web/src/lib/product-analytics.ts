"use client";

import { track } from "@vercel/analytics";
import { metaEventForProductEvent } from "@/lib/meta-events";
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

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackProductEvent(
  name: ProductEventName,
  properties: ProductEventProperties = {},
) {
  const compacted = compactProperties(properties);
  const eventId = makeEventId(name);

  try {
    track(name, compacted);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] event dropped", name, error);
    }
  }

  trackMetaPixelEvent(name, compacted, eventId);
  sendStructuredEvent(name, compacted, eventId);
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

function sendStructuredEvent(
  name: ProductEventName,
  properties: Record<string, string | number | boolean | null>,
  eventId: string,
) {
  const payload = JSON.stringify({
    name,
    properties,
    eventId,
    path: sanitizePathname(window.location.pathname),
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/product-events",
      new Blob([payload], { type: "application/json" }),
    );
    if (sent) return;
  }

  void fetch("/api/product-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt product workflows.
  });
}

function trackMetaPixelEvent(
  name: ProductEventName,
  properties: Record<string, string | number | boolean | null>,
  eventId: string,
) {
  const metaEvent = metaEventForProductEvent(name, properties);
  if (!metaEvent || typeof window.fbq !== "function") return;

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

function makeEventId(name: ProductEventName) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${name}-${suffix}`;
}

function sanitizePathname(pathname: string) {
  return pathname.replace(/^\/q\/[^/]+/, "/q/[token]");
}
