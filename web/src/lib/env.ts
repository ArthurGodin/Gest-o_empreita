import { z } from "zod";

/**
 * Env público — safe para client e server. Apenas NEXT_PUBLIC_*.
 *
 * Para variáveis sensíveis (service role, secrets), use `@/lib/env-server`
 * (que tem o guard `import "server-only"`).
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const SKIP = process.env.SKIP_ENV_VALIDATION === "true";

const parsed = SKIP
  ? { success: true as const, data: {} as z.infer<typeof envSchema> }
  : envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });

if (!parsed.success) {
  console.error(
    "❌ Variáveis de ambiente públicas inválidas:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error(
    "NEXT_PUBLIC_* env vars faltando. Copie web/.env.local.example para web/.env.local e preencha. " +
      "Para build sem env vars, use SKIP_ENV_VALIDATION=true.",
  );
}

export const env = parsed.data;
