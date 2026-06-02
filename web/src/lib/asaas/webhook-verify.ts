import "server-only";

import { timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env-server";

export function validateAsaasWebhookToken(received: string | null): boolean {
  const expected = serverEnv.ASAAS_WEBHOOK_TOKEN;
  if (!expected || !received) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
