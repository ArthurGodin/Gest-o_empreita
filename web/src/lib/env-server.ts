import "server-only";
import {
  parseServerEnv,
  type ServerEnvInput,
} from "@/lib/env-server-core";

/**
 * Env exclusivamente server-side. Nunca importe em Client Components.
 * Segredos ficam fora do bundle do navegador.
 */
const SKIP = process.env.SKIP_ENV_VALIDATION === "true";

const input: ServerEnvInput = SKIP
  ? {}
  : {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
      ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO,
      ASAAS_API_KEY: process.env.ASAAS_API_KEY,
      ASAAS_API_URL: process.env.ASAAS_API_URL,
      ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
      META_CONVERSIONS_ACCESS_TOKEN: process.env.META_CONVERSIONS_ACCESS_TOKEN,
      META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE,
      META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
    };

const parsed = parseServerEnv(input);

if (Object.keys(parsed.fieldErrors).length > 0) {
  console.warn(
    "Aviso: Variaveis de ambiente server-side não configuradas no build:",
    parsed.fieldErrors,
  );
}

export const serverEnv = parsed.data;
