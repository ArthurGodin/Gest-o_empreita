/**
 * Helpers de formatação BR. Mantém-se separado de utils.ts pois utils tem
 * helpers visuais (cn) e isso aqui é dado.
 */

export function formatPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export function formatDocument(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    // CPF: 000.000.000-00
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return raw;
}

/**
 * Monta link wa.me, normalizando para o formato 55 + DDD + número.
 *
 * Aceita:
 *   - 10 dígitos (DDD + fixo)           → adiciona "55"
 *   - 11 dígitos (DDD + celular)        → adiciona "55"
 *   - 12 dígitos começando com "55"     → mantém (já tem código)
 *   - 13 dígitos começando com "55"     → mantém
 *   - qualquer outro tamanho            → retorna null (formato inválido)
 *
 * Não tentamos "consertar" números ambíguos (ex: 12 dígitos sem 55 prefixo) —
 * melhor não gerar link do que mandar o empreiteiro pra um número errado.
 */
export function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");

  // Sem código do país (Brasil) — DDD + número
  if (digits.length === 10 || digits.length === 11) {
    return `https://wa.me/55${digits}`;
  }

  // Já vem com 55 na frente
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return `https://wa.me/${digits}`;
  }

  return null;
}
