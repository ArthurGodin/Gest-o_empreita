import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin client — usa a SECRET KEY e BYPASSA RLS.
 *
 * USAR APENAS para operações de bootstrap onde o RLS não consegue ser aplicado
 * (ex: onboarding — usuário ainda não é membro de nenhuma empresa).
 *
 * NUNCA importar isso em código que roda no client. O `import "server-only"`
 * acima quebra o build se alguém tentar.
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não está configurada. Preencha em web/.env.local.",
    );
  }

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
