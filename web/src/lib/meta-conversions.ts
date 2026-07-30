import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env-server";
import { logServerWarning } from "@/lib/log";
import { hasGrantedMarketingConsent } from "@/lib/marketing-consent";
import {
  isProductEventId,
  metaEventForProductEvent,
} from "@/lib/meta-events";
import type { ProductEventName } from "@/lib/product-event-names";

type ProductEventProperties = Record<string, string | number | boolean | null>;

type HeaderReader = Pick<Headers, "get">;

interface SendMetaConversionsInput {
  name: ProductEventName;
  properties: ProductEventProperties;
  eventId: string;
  path: string;
  requestHeaders: HeaderReader;
  externalId?: string | null;
}

const SERVER_CONVERSION_EVENTS = new Set<ProductEventName>([
  "signup_completed",
  "onboarding_completed",
  "saas_checkout_generated",
]);

export async function sendMetaConversionsEvent({
  name,
  properties,
  eventId,
  path,
  requestHeaders,
  externalId,
}: SendMetaConversionsInput) {
  if (!SERVER_CONVERSION_EVENTS.has(name) || !isProductEventId(eventId)) {
    return { sent: false as const, reason: "unsupported_event" as const };
  }

  const cookieHeader = requestHeaders.get("cookie") ?? "";
  if (!hasGrantedMarketingConsent(cookieHeader)) {
    return { sent: false as const, reason: "consent_not_granted" as const };
  }

  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = serverEnv.META_CONVERSIONS_ACCESS_TOKEN;
  const metaEvent = metaEventForProductEvent(name, properties);
  if (!pixelId || !accessToken || !metaEvent) {
    return { sent: false as const, reason: "not_configured" as const };
  }

  const userData = userDataFromRequest(cookieHeader, externalId);
  if (Object.keys(userData).length === 0) {
    return { sent: false as const, reason: "matching_data_absent" as const };
  }

  const payload = {
    data: [
      {
        event_name: metaEvent.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: eventSourceUrl(path),
        user_data: userData,
        custom_data: metaEvent.customData,
      },
    ],
    ...(serverEnv.META_TEST_EVENT_CODE
      ? { test_event_code: serverEnv.META_TEST_EVENT_CODE }
      : {}),
  };

  const url = new URL(
    `https://graph.facebook.com/${serverEnv.META_GRAPH_API_VERSION}/${pixelId}/events`,
  );
  url.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      logServerWarning("meta.capi.failed", {
        event: name,
        meta_event: metaEvent.eventName,
        status: response.status,
      });
      return { sent: false as const, reason: "provider_error" as const };
    }

    return { sent: true as const };
  } catch (error) {
    logServerWarning("meta.capi.request_failed", {
      event: name,
      meta_event: metaEvent.eventName,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return { sent: false as const, reason: "request_failed" as const };
  }
}

export function hashMetaExternalId(value: string) {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

function userDataFromRequest(
  cookieHeader: string,
  externalId: string | null | undefined,
) {
  const cookies = parseCookieHeader(cookieHeader);
  return {
    ...(cookies._fbp ? { fbp: cookies._fbp } : {}),
    ...(cookies._fbc ? { fbc: cookies._fbc } : {}),
    ...(externalId
      ? { external_id: [hashMetaExternalId(externalId)] }
      : {}),
  };
}

function eventSourceUrl(path: string) {
  try {
    return new URL(path || "/", env.NEXT_PUBLIC_APP_URL).toString();
  } catch {
    return env.NEXT_PUBLIC_APP_URL;
  }
}

function parseCookieHeader(header: string) {
  const cookies: Record<string, string> = {};

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      continue;
    }
  }

  return cookies;
}
