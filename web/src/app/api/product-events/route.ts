import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOperationalAlert } from "@/lib/alerts";
import { logServerEvent, logServerWarning } from "@/lib/log";
import { sendMetaConversionsEvent } from "@/lib/meta-conversions";
import { isProductEventName } from "@/lib/product-event-names";

const propertyValueSchema = z.union([
  z.string().max(160),
  z.number(),
  z.boolean(),
  z.null(),
]);

const payloadSchema = z.object({
  name: z.string().min(1).max(80),
  eventId: z.string().min(8).max(160).optional(),
  path: z.string().min(1).max(160).optional(),
  properties: z.record(z.string().max(48), propertyValueSchema).default({}),
});

export async function POST(request: Request) {
  const start = Date.now();

  try {
    const payload = payloadSchema.safeParse(await request.json());
    if (!payload.success || !isProductEventName(payload.data.name)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const path = sanitizePath(payload.data.path ?? "");
    const eventId =
      payload.data.eventId ?? `${payload.data.name}-${crypto.randomUUID()}`;
    logServerEvent("product_event", {
      event: payload.data.name,
      event_id: eventId,
      path,
      request_id: request.headers.get("x-vercel-id"),
      ms: Date.now() - start,
      ...prefixProperties(payload.data.properties),
    });

    if (
      payload.data.name === "app_error_boundary" ||
      payload.data.name === "global_error_boundary"
    ) {
      await sendOperationalAlert({
        area: "frontend",
        severity: "critical",
        title:
          payload.data.name === "app_error_boundary"
            ? "Erro na area autenticada"
            : "Erro global no site",
        message:
          "Uma error boundary do Next/React capturou erro no navegador. Verifique logs de runtime e evento product_event.",
        dedupeKey: `frontend-${payload.data.name}-${path}-${String(payload.data.properties.digest ?? "no-digest")}`,
        context: {
          event: payload.data.name,
          event_id: eventId,
          path,
          digest: payload.data.properties.digest ?? null,
          request_id: request.headers.get("x-vercel-id"),
        },
      });
    }

    await sendMetaConversionsEvent({
      name: payload.data.name,
      properties: payload.data.properties,
      eventId,
      path,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerWarning("product_event_invalid_request", {
      request_id: request.headers.get("x-vercel-id"),
      reason: error instanceof Error ? error.name : "unknown",
      ms: Date.now() - start,
    });

    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

function sanitizePath(path: string) {
  return path.replace(/^\/q\/[^/]+/, "/q/[token]");
}

function prefixProperties(
  properties: Record<string, string | number | boolean | null>,
) {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [`prop_${key}`, value]),
  );
}
