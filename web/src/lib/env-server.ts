import "server-only";
import {
  parseServerEnv,
  type ServerEnvInput,
} from "@/lib/env-server-core";

/**
 * Env exclusivamente server-side. Nunca importe em Client Components.
 * Segredos ficam fora do bundle do navegador.
 */
const input: ServerEnvInput = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO,
  OPERATIONAL_ADMIN_EMAILS: process.env.OPERATIONAL_ADMIN_EMAILS,
  CRON_SECRET: process.env.CRON_SECRET,
  ASAAS_API_KEY: process.env.ASAAS_API_KEY,
  ASAAS_API_URL: process.env.ASAAS_API_URL,
  ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
  META_CONVERSIONS_ACCESS_TOKEN: process.env.META_CONVERSIONS_ACCESS_TOKEN,
  META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE,
  META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
  PRUMO_LEGAL_NAME: process.env.PRUMO_LEGAL_NAME,
  PRUMO_LEGAL_DOCUMENT: process.env.PRUMO_LEGAL_DOCUMENT,
  PRUMO_LEGAL_ADDRESS: process.env.PRUMO_LEGAL_ADDRESS,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
  PRUMO_LEGAL_DOCS_UPDATED_AT: process.env.PRUMO_LEGAL_DOCS_UPDATED_AT,
};

const parsed = parseServerEnv(input);

if (Object.keys(parsed.fieldErrors).length > 0) {
  console.warn(
    "Aviso: Variaveis de ambiente server-side não configuradas no build:",
    parsed.fieldErrors,
  );
}

export const serverEnv = parsed.data;
