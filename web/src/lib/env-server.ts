import "server-only";
import { z } from "zod";

/**
 * Env exclusivamente server-side. Nunca importe em Client Components.
 * Segredos ficam fora do bundle do navegador.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_API_URL: z.string().url().default("https://api-sandbox.asaas.com/v3"),
  ASAAS_WEBHOOK_TOKEN: z.string().min(32).optional(),
});

const SKIP = process.env.SKIP_ENV_VALIDATION === "true";

const parsed = SKIP
  ? { success: true as const, data: {} as z.infer<typeof serverEnvSchema> }
  : serverEnvSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
      ASAAS_API_KEY: process.env.ASAAS_API_KEY,
      ASAAS_API_URL: process.env.ASAAS_API_URL,
      ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
    });

if (!parsed.success) {
  console.error(
    "Variaveis de ambiente server-side invalidas:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error(
    "Env vars server-side faltando. Copie web/.env.local.example para web/.env.local e preencha. " +
      "Para build sem env vars, use SKIP_ENV_VALIDATION=true.",
  );
}

export const serverEnv = parsed.data;
