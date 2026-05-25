import "server-only";
import { z } from "zod";

/**
 * Env exclusivamente server-side. Importar em client component dispara
 * erro de build pelo `server-only`. Contém segredos que NUNCA podem
 * vazar para o bundle do navegador.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const SKIP = process.env.SKIP_ENV_VALIDATION === "true";

const parsed = SKIP
  ? { success: true as const, data: {} as z.infer<typeof serverEnvSchema> }
  : serverEnvSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

if (!parsed.success) {
  console.error(
    "❌ Variáveis de ambiente server-side inválidas:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY faltando. Copie web/.env.local.example para web/.env.local e preencha. " +
      "Para build sem env vars, use SKIP_ENV_VALIDATION=true.",
  );
}

export const serverEnv = parsed.data;
