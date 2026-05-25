/**
 * Helpers de formatação BR. Mantém-se separado de utils.ts pois utils tem
 * helpers visuais (cn) e isso aqui é dado.
 */

// ─── Quantidade (números com vírgula BR) ───────────────────────────────────

/**
 * Parser de quantidade aceita "1.5" e "1,5" (notação BR). parseFloat() puro
 * trata "1,5" como 1 (para na vírgula) — bug clássico em UI brasileira.
 * Negativos viram 0. NaN vira 0.
 */
export function parseQuantity(input: string | number): number {
  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? input : 0;
  }
  if (!input) return 0;
  const cleaned = String(input).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// ─── Dinheiro ──────────────────────────────────────────────────────────────

/**
 * Converte input de usuário ("R$ 8,00", "8,00", "8.00", "8", "1.234,56")
 * em valor em centavos (int).
 *
 * Retorna null se a entrada não bate o formato esperado.
 *
 * Regras:
 *   - Strip de espaços, "R$", e separadores de milhares
 *   - Aceita vírgula OU ponto como separador decimal (último não-dígito vira ponto)
 *   - Não aceita negativo
 *   - Não aceita mais de 2 casas decimais (truncia, não arredonda — comportamento de "centavos exatos")
 */
export function parseBRLToCents(input: string): number | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Remove "R$", espaços e qualquer char não dígito/separador
  const cleaned = trimmed.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  if (cleaned.includes("-")) return null;

  // Identifica o separador decimal: o ÚLTIMO ponto ou vírgula é decimal,
  // os anteriores são milhar.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSepIdx = Math.max(lastComma, lastDot);

  let integerPart: string;
  let decimalPart: string;
  if (decimalSepIdx === -1) {
    integerPart = cleaned;
    decimalPart = "";
  } else {
    integerPart = cleaned.slice(0, decimalSepIdx).replace(/[.,]/g, "");
    decimalPart = cleaned.slice(decimalSepIdx + 1).replace(/[.,]/g, "");
  }

  if (!integerPart) integerPart = "0";
  if (!/^\d+$/.test(integerPart)) return null;
  if (decimalPart && !/^\d+$/.test(decimalPart)) return null;

  // Trunca a 2 casas decimais (não permitimos mais)
  const decimalNormalized = (decimalPart + "00").slice(0, 2);

  const cents = parseInt(integerPart, 10) * 100 + parseInt(decimalNormalized || "0", 10);
  if (isNaN(cents)) return null;
  return cents;
}

/** Inverso de parseBRLToCents: 800 → "8,00". Pra preencher inputs editáveis. */
export function centsToBRLInput(cents: number): string {
  if (!Number.isFinite(cents)) return "0,00";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100);
  const centavos = (abs % 100).toString().padStart(2, "0");
  return `${sign}${reais.toString()},${centavos}`;
}

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
