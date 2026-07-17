export const BRAZIL_STATE_CODES = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

export type BrazilStateCode = (typeof BRAZIL_STATE_CODES)[number];

const BRAZIL_STATE_CODE_SET = new Set<string>(BRAZIL_STATE_CODES);

export function isBrazilStateCode(value: unknown): value is BrazilStateCode {
  return (
    typeof value === "string" &&
    BRAZIL_STATE_CODE_SET.has(value.trim().toUpperCase())
  );
}

export function normalizeBrazilStateCode(
  value: unknown,
): BrazilStateCode | null {
  if (!isBrazilStateCode(value)) return null;
  return value.trim().toUpperCase() as BrazilStateCode;
}
