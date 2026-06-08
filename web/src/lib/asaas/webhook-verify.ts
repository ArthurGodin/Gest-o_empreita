import "server-only";

import { serverEnv } from "@/lib/env-server";
import { timingSafeTokenMatches } from "./webhook-verify-core";

export function validateAsaasWebhookToken(received: string | null): boolean {
  return timingSafeTokenMatches(received, serverEnv.ASAAS_WEBHOOK_TOKEN);
}
