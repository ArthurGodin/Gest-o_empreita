import "server-only";
import { z } from "zod";

/**
 * Env exclusivamente server-side. Importar em client component dispara
 * erro de build pelo `server-only`. Contém segredos que NUNCA podem
 * vazar para o bundle do navegador.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Email transacional (Resend). Optional em dev/local — sem chave,
  // notificações ficam só logadas. Em produção, configurar.
  RESEND_API_KEY: z.string().min(1).optional(),
});

const SKIP = process.env.SKIP_ENV_VALIDATION === "true";

const parsed = SKIP
  ? { success: true as const, data: {} as z.infer<typeof serverEnvSchema> }
  : serverEnvSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
    });

if (!parsed.success) {
  console.error(
    "❌ Variáveis de ambiente server-side inválidas:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error(
    "Env vars server-side faltando. Copie web/.env.local.example para web/.env.local e preencha. " +
      "Para build sem env vars, use SKIP_ENV_VALIDATION=true.",
  );
}

export const serverEnv = parsed.data;
