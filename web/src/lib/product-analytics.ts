"use client";

import { track } from "@vercel/analytics";
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

export function trackProductEvent(
  name: ProductEventName,
  properties: ProductEventProperties = {},
) {
  const compacted = compactProperties(properties);

  try {
    track(name, compacted);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] event dropped", name, error);
    }
  }

  sendStructuredEvent(name, compacted);
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
) {
  const payload = JSON.stringify({
    name,
    properties,
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

function sanitizePathname(pathname: string) {
  return pathname.replace(/^\/q\/[^/]+/, "/q/[token]");
}
