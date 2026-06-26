import "server-only";
import { z } from "zod";

/**
 * Env exclusivamente server-side. Nunca importe em Client Components.
 * Segredos ficam fora do bundle do navegador.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_API_URL: z.string().url().default("https://api-sandbox.asaas.com/v3"),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
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
  console.warn(
    "Aviso: Variaveis de ambiente server-side não configuradas no build:",
    parsed.error.flatten().fieldErrors,
  );
  // Não trava a Vercel durante o build se as chaves faltarem!
}

const fallbackServerEnv: z.infer<typeof serverEnvSchema> = {
  ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
};

export const serverEnv = parsed.success ? parsed.data : fallbackServerEnv;
