import "server-only";

/**
 * Log seguro para erros do Supabase / Postgres em server actions.
 *
 * - Loga `code`, `name` e uma mensagem **truncada** no servidor.
 * - NÃO loga o payload original (que pode conter PII: nome, email, telefone, CPF).
 * - NÃO retorna a mensagem original para o client. Sempre retorne uma string
 *   genérica via `clientErrorFor()` para evitar leak de internos do DB.
 */
export interface LoggableError {
  code?: string | null;
  message?: string | null;
  name?: string | null;
  details?: string | null;
}

export function logServerError(scope: string, error: LoggableError | unknown) {
  const e = (error ?? {}) as LoggableError;
  // Trunca a mensagem pra mitigar leak de PII (Supabase às vezes ecoa fragmentos
  // de payload em mensagens de constraint violation).
  const msg = (e.message ?? String(error)).slice(0, 200);
  console.error(
    `[${scope}] ${e.code ?? "no-code"} ${e.name ?? ""} :: ${msg}`,
  );
}

/**
 * Mensagem genérica e segura para devolver ao client. Mapeia códigos
 * conhecidos do Postgres para textos amigáveis em PT-BR.
 */
export function clientErrorFor(error: LoggableError | unknown): string {
  const e = (error ?? {}) as LoggableError;
  switch (e.code) {
    case "23505": // unique_violation
      return "Já existe um registro com esses dados.";
    case "23503": // foreign_key_violation
      return "Esse registro está vinculado a outros e não pode ser modificado.";
    case "23502": // not_null_violation
      return "Campo obrigatório faltando.";
    case "42501": // insufficient_privilege (RLS)
      return "Você não tem permissão para essa ação.";
    case "PGRST116": // PostgREST: row not found
      return "Registro não encontrado.";
    default:
      return "Não foi possível concluir a operação. Tente novamente.";
  }
}
