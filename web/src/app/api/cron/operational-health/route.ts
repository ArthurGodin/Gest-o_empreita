import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env-server";
import { logServerError, logServerEvent, logServerWarning } from "@/lib/log";
import { timingSafeCronSecretMatches } from "@/lib/operations/cron-auth-core";
import { runOperationalMonitor } from "@/lib/operations/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id");
  if (
    !timingSafeCronSecretMatches(
      request.headers.get("authorization"),
      serverEnv.CRON_SECRET,
    )
  ) {
    logServerWarning("ops.monitor.unauthorized", {
      request_id: requestId,
      ms: Date.now() - startedAt,
    });
    return response({ ok: false, status: "unauthorized" }, 401);
  }

  const now = new Date();
  const trigger =
    request.headers.get("user-agent") === "vercel-cron/1.0"
      ? "cron"
      : "manual";
  const runKey =
    trigger === "cron"
      ? `cron:${now.toISOString().slice(0, 10)}`
      : `manual:${randomUUID()}`;

  try {
    const result = await runOperationalMonitor({ runKey, trigger });
    logServerEvent("ops.monitor.request_completed", {
      trigger,
      status: result.status,
      request_id: requestId,
      ms: Date.now() - startedAt,
    });
    return response({ ok: true, status: result.status }, 200);
  } catch (error) {
    logServerError(
      "ops.monitor.request_failed",
      {
        name: error instanceof Error ? error.name : "unknown",
        message: "monitor_failed",
      },
      {
        trigger,
        request_id: requestId,
        ms: Date.now() - startedAt,
      },
    );
    return response({ ok: false, status: "failed" }, 500);
  }
}

function response(
  body: { ok: boolean; status: string },
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}
