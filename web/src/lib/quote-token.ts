import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Gera um token criptográfico seguro para o share_link de um orçamento.
 *
 * 32 bytes = 256 bits de entropia. Após strip de '+/=' (pra ficar URL-safe
 * sem precisar de encoding extra), sobram pelo menos 38 chars sempre — bem
 * acima do CHECK length >= 32 imposto no DB.
 *
 * NÃO recuperável (sem "esqueci o token"). Empreiteiro pode revogar e gerar
 * um novo via `revokeShareTokenAction`.
 */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64").replace(/[+/=]/g, "");
}

/**
 * Comparação constant-time pra evitar timing attacks na validação de token
 * em rotas anônimas (/q/[token]). Use quando comparar token recebido vs
 * token armazenado no DB.
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
