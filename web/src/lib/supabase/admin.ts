import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env-server";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin client — usa a SECRET KEY e BYPASSA RLS.
 *
 * USAR APENAS para operações de bootstrap onde o RLS não consegue ser aplicado
 * (ex: onboarding — usuário ainda não é membro de nenhuma empresa).
 *
 * NUNCA importar isso em código que roda no client. O `import "server-only"`
 * acima quebra o build se alguém tentar.
 *
 * SUPABASE_SERVICE_ROLE_KEY é validado no boot via env-server.ts — se
 * estiver faltando, o app não sobe. Deploy é fail-fast.
 */
export function createAdminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
