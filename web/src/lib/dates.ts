/**
 * Helpers de data centralizados — sempre tratam dates como BR (UTC-3),
 * independente da TZ do host (servidor Vercel roda em UTC).
 *
 * Por que isso importa: `new Date().toISOString().slice(0, 10)` em servidor
 * UTC retorna o dia UTC, que pode ser 1 dia à frente do dia BR depois das
 * 21:00 BR. Esse helper sempre retorna o dia BR.
 */

const BR_TIMEZONE = "America/Sao_Paulo";

/**
 * Data de hoje no fuso BR, formato `YYYY-MM-DD`.
 *
 * Bulletproof contra TZ do host (`en-CA` formata como ISO date).
 */
export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Data hoje + N dias no fuso BR, formato `YYYY-MM-DD`.
 * Usado pra default de `valid_until` em orçamentos, previsão de término de
 * obra, etc.
 */
export function addDaysBR(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Parser seguro de string date-only `YYYY-MM-DD` que NÃO converte pra UTC.
 * Útil quando você quer exibir uma date-only no formato BR sem o erro
 * "1 dia anterior" causado por interpretação UTC.
 */
export function parseDateOnly(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(s);
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}
