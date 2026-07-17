import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = (schema: z.ZodString) =>
  z.preprocess(emptyStringToUndefined, schema.optional());

const stringWithDefault = (schema: z.ZodString, fallback: string) =>
  z.preprocess(emptyStringToUndefined, schema.default(fallback));

export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalString(z.string().min(1)),
  RESEND_API_KEY: optionalString(z.string().min(1)),
  EMAIL_FROM: optionalString(z.string().min(3)),
  ALERT_EMAIL_TO: optionalString(z.string().min(3)),
  CRON_SECRET: optionalString(z.string().min(32)),
  ASAAS_API_KEY: optionalString(z.string().min(1)),
  ASAAS_API_URL: stringWithDefault(
    z.string().url(),
    "https://api-sandbox.asaas.com/v3",
  ),
  ASAAS_WEBHOOK_TOKEN: optionalString(z.string()),
  META_CONVERSIONS_ACCESS_TOKEN: optionalString(z.string().min(1)),
  META_TEST_EVENT_CODE: optionalString(z.string().min(1)),
  META_GRAPH_API_VERSION: stringWithDefault(
    z.string().regex(/^v\d+\.\d+$/),
    "v23.0",
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ServerEnvInput = Partial<Record<keyof ServerEnv, unknown>>;

type ServerEnvParseResult = {
  data: ServerEnv;
  fieldErrors: Partial<Record<keyof ServerEnv, string[]>>;
};

/**
 * Mantem campos validos disponiveis mesmo quando outra integracao opcional
 * estiver mal configurada. Cada campo invalido volta apenas ao proprio padrao.
 */
export function parseServerEnv(input: ServerEnvInput): ServerEnvParseResult {
  const parsed = serverEnvSchema.safeParse(input);
  if (parsed.success) {
    return { data: parsed.data, fieldErrors: {} };
  }

  const fallback = serverEnvSchema.parse({});

  function parseField<K extends keyof ServerEnv>(key: K): ServerEnv[K] {
    const fieldResult = serverEnvSchema.shape[key].safeParse(input[key]);
    return fieldResult.success
      ? (fieldResult.data as ServerEnv[K])
      : fallback[key];
  }

  return {
    data: {
      SUPABASE_SERVICE_ROLE_KEY: parseField("SUPABASE_SERVICE_ROLE_KEY"),
      RESEND_API_KEY: parseField("RESEND_API_KEY"),
      EMAIL_FROM: parseField("EMAIL_FROM"),
      ALERT_EMAIL_TO: parseField("ALERT_EMAIL_TO"),
      CRON_SECRET: parseField("CRON_SECRET"),
      ASAAS_API_KEY: parseField("ASAAS_API_KEY"),
      ASAAS_API_URL: parseField("ASAAS_API_URL"),
      ASAAS_WEBHOOK_TOKEN: parseField("ASAAS_WEBHOOK_TOKEN"),
      META_CONVERSIONS_ACCESS_TOKEN: parseField(
        "META_CONVERSIONS_ACCESS_TOKEN",
      ),
      META_TEST_EVENT_CODE: parseField("META_TEST_EVENT_CODE"),
      META_GRAPH_API_VERSION: parseField("META_GRAPH_API_VERSION"),
    },
    fieldErrors: parsed.error.flatten().fieldErrors,
  };
}
