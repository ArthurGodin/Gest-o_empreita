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
  status?: number | null;
}

type LogValue = string | number | boolean | null;
type LogContext = Record<string, LogValue | LogValue[] | undefined>;
type LogLevel = "info" | "warn" | "error";

export function logServerEvent(message: string, context: LogContext = {}) {
  writeStructuredLog("info", message, context);
}

export function logServerWarning(message: string, context: LogContext = {}) {
  writeStructuredLog("warn", message, context);
}

export function logServerError(
  scope: string,
  error: LoggableError | unknown,
  context: LogContext = {},
) {
  const e = (error ?? {}) as LoggableError;
  // Trunca a mensagem pra mitigar leak de PII (Supabase às vezes ecoa fragmentos
  // de payload em mensagens de constraint violation).
  const msg = (e.message ?? String(error)).slice(0, 200);
  writeStructuredLog("error", scope, {
    ...context,
    scope,
    error_code: e.code ?? "no-code",
    error_name: e.name ?? null,
    error_status: e.status ?? null,
    error_message: msg,
  });
}

function writeStructuredLog(
  level: LogLevel,
  message: string,
  context: LogContext,
) {
  const payload = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...compactContext(context),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

function compactContext(context: LogContext) {
  const compacted: Record<string, LogValue | LogValue[]> = {};

  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) compacted[key] = value;
  }

  return compacted;
}

/**
 * Mensagem genérica e segura para devolver ao client. Mapeia códigos
 * conhecidos do Postgres para textos amigáveis em PT-BR.
 */
export function clientErrorFor(error: LoggableError | unknown): string {
  const e = (error ?? {}) as LoggableError;
  const message = (e.message ?? "").toLowerCase();

  if (e.name === "AsaasConfigError") {
    return "Asaas ainda não está configurado. Preencha a API Key e a URL da API antes de gerar Pix.";
  }

  if (message.includes("pelo menos r$ 5,00")) {
    return "Cobrança Pix precisa ser de pelo menos R$ 5,00.";
  }

  if (e.name === "AsaasApiError") {
    if (e.status === 401 || e.status === 403) {
      return "Asaas recusou a chave configurada. Atualize a API Key do Asaas nas variáveis de ambiente e reinicie o deploy.";
    }
    if (e.status === 400) {
      return "Asaas recusou os dados da cobrança. Confira CPF/CNPJ do cliente e tente gerar o Pix novamente.";
    }
    return "Asaas não concluiu a geração do Pix agora. Tente novamente em instantes.";
  }

  if (message.includes("cpf/cnpj")) {
    return "Informe um CPF/CNPJ válido no cliente antes de gerar a cobrança Pix.";
  }

  if (message.includes("free_quote_limit_reached")) {
    return "Você chegou ao limite do Plano Grátis: 3 orçamentos neste mês. Assine o Pro para criar orçamentos e obras sem limite.";
  }

  if (message.includes("free_active_project_limit_reached")) {
    return "O Plano Grátis permite 1 obra simultânea. Conclua a obra atual ou assine o Pro para controlar obras sem limite.";
  }

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
