import {
  parsePublicEnv,
  type PublicEnvInput,
} from "@/lib/env-public-core";

/**
 * Env público — safe para client e server. Apenas NEXT_PUBLIC_*.
 *
 * Para variáveis sensíveis (service role, secrets), use `@/lib/env-server`
 * (que tem o guard `import "server-only"`).
 */
const SKIP = process.env.SKIP_ENV_VALIDATION === "true";

const input: PublicEnvInput = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
};
const parsed = parsePublicEnv(input);
const hasErrors = Object.keys(parsed.fieldErrors).length > 0;

if (hasErrors && !SKIP) {
  console.error(
    "❌ Variáveis de ambiente públicas inválidas:",
    parsed.fieldErrors,
  );
  throw new Error(
    "NEXT_PUBLIC_* env vars faltando. Copie web/.env.local.example para web/.env.local e preencha. " +
      "Para build sem env vars, use SKIP_ENV_VALIDATION=true.",
  );
}

if (hasErrors && SKIP) {
  console.warn(
    "Aviso: build usando fallback apenas para NEXT_PUBLIC_* ausentes ou inválidas:",
    parsed.fieldErrors,
  );
}

export const env = parsed.data;
