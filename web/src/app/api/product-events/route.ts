import { NextResponse } from "next/server";
import { z } from "zod";
import { isProductEventName } from "@/lib/product-event-names";

const propertyValueSchema = z.union([
  z.string().max(160),
  z.number(),
  z.boolean(),
  z.null(),
]);

const payloadSchema = z.object({
  name: z.string().min(1).max(80),
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
    console.log(
      JSON.stringify({
        level: "info",
        message: "product_event",
        event: payload.data.name,
        path,
        properties: payload.data.properties,
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "product_event_failed",
        error: error instanceof Error ? error.message : String(error),
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
      }),
    );

    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

function sanitizePath(path: string) {
  return path.replace(/^\/q\/[^/]+/, "/q/[token]");
}
