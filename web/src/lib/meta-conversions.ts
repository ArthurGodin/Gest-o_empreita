import "server-only";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env-server";
import { logServerWarning } from "@/lib/log";
import { metaEventForProductEvent } from "@/lib/meta-events";
import type { ProductEventName } from "@/lib/product-event-names";

type ProductEventProperties = Record<string, string | number | boolean | null>;

interface SendMetaConversionsInput {
  name: ProductEventName;
  properties: ProductEventProperties;
  eventId: string;
  path: string;
  request: Request;
}

export async function sendMetaConversionsEvent({
  name,
  properties,
  eventId,
  path,
  request,
}: SendMetaConversionsInput) {
  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = serverEnv.META_CONVERSIONS_ACCESS_TOKEN;
  const metaEvent = metaEventForProductEvent(name, properties);

  if (!pixelId || !accessToken || !metaEvent) return;

  const payload = {
    data: [
      {
        event_name: metaEvent.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: eventSourceUrl(path),
        user_data: userDataFromRequest(request),
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
    });

    if (!response.ok) {
      const body = await response.text();
      logServerWarning("meta.capi.failed", {
        event: name,
        meta_event: metaEvent.eventName,
        status: response.status,
        response: body.slice(0, 320),
      });
    }
  } catch (error) {
    logServerWarning("meta.capi.request_failed", {
      event: name,
      meta_event: metaEvent.eventName,
      reason: error instanceof Error ? error.name : "unknown",
    });
  }
}

function userDataFromRequest(request: Request) {
  const cookies = parseCookieHeader(request.headers.get("cookie") ?? "");
  return compact({
    client_ip_address: clientIp(request),
    client_user_agent: request.headers.get("user-agent"),
    fbp: cookies._fbp,
    fbc: cookies._fbc,
  });
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    null
  );
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
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || rawValue.length === 0) continue;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  }

  return cookies;
}

function compact(input: Record<string, string | null | undefined>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  );
}
