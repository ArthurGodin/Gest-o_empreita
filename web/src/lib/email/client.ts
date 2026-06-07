import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env-server";

/**
 * Cliente Resend pra emails transacionais.
 *
 * Em dev sem RESEND_API_KEY configurada, este module retorna null e o caller
 * loga o conteúdo do email em vez de enviar (não bloqueia o fluxo).
 */
let _resend: Resend | null | undefined;

export function getResendClient(): Resend | null {
  if (_resend !== undefined) return _resend;
  if (!serverEnv.RESEND_API_KEY) {
    _resend = null;
    return null;
  }
  _resend = new Resend(serverEnv.RESEND_API_KEY);
  return _resend;
}

/** Remetente padrão. Sem domínio próprio, usa o default do Resend (dev). */
export const DEFAULT_FROM =
  serverEnv.EMAIL_FROM ?? "Gestão Empreita <onboarding@resend.dev>";

export const TRANSACTIONAL_EMAIL_ENABLED = Boolean(
  serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM,
);
