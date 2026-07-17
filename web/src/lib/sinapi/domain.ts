import type { BrazilStateCode } from "@/lib/brazil-states";

export const SINAPI_REFERENCE_KINDS = ["input", "composition"] as const;
export type SinapiReferenceKind = (typeof SINAPI_REFERENCE_KINDS)[number];

export const SINAPI_REGIMES = [
  "sem_desoneracao",
  "com_desoneracao",
  "sem_encargos_sociais",
] as const;
export type SinapiRegime = (typeof SINAPI_REGIMES)[number];

export const SINAPI_REGIME_LABELS: Record<SinapiRegime, string> = {
  sem_desoneracao: "Sem desoneracao",
  com_desoneracao: "Com desoneracao",
  sem_encargos_sociais: "Sem encargos sociais",
};

export const SINAPI_BASIS_POINTS_PER_PERCENT = 100;
export const SINAPI_BASIS_POINTS_SCALE = 10_000;
export const SINAPI_MAX_ADJUSTMENT_BASIS_POINTS = 100_000;

export interface SinapiPriceMetadata {
  origin?: string;
  attributed_sp_basis_points?: number;
}

export type SinapiPricesByState = Partial<Record<BrazilStateCode, number>>;
export type SinapiPriceMetadataByState = Partial<
  Record<BrazilStateCode, SinapiPriceMetadata>
>;

export interface NormalizedSinapiEntry {
  kind: SinapiReferenceKind;
  code: string;
  description: string;
  unit: string;
  regime: SinapiRegime;
  prices_cents: SinapiPricesByState;
  price_metadata: SinapiPriceMetadataByState;
  search_text: string;
}

export function normalizeSinapiCompetence(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  const match = /^(?:(\d{2})\/(\d{4})|(\d{4})-(\d{2})(?:-01)?)$/.exec(
    normalized,
  );
  if (!match) return null;

  const month = Number(match[1] ?? match[4]);
  const year = Number(match[2] ?? match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-01`;
}

export function normalizeSinapiCode(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }
  if (typeof value !== "string") return null;

  const code = value.trim().toUpperCase();
  if (
    code.length === 0 ||
    code.length > 40 ||
    !/^[A-Z0-9][A-Z0-9._/-]*$/.test(code) ||
    /^0+$/.test(code)
  ) {
    return null;
  }
  return code;
}

export function normalizeSinapiDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const description = value.trim().replace(/\s+/g, " ");
  return description.length > 0 && description.length <= 500
    ? description
    : null;
}

export function normalizeSinapiUnit(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const unit = value.trim().replace(/\s+/g, " ").toUpperCase();
  return unit.length > 0 && unit.length <= 20 ? unit : null;
}

export function normalizeSinapiSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseSinapiMoneyToCents(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    const cents = Math.round(value * 100);
    return Math.abs(value * 100 - cents) < 1e-7 && Number.isSafeInteger(cents)
      ? cents
      : null;
  }
  if (typeof value !== "string") return null;

  let normalized = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!normalized || normalized.startsWith("-")) return null;

  if (normalized.includes(",")) {
    if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(normalized)) {
      return null;
    }
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const decimalMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!decimalMatch) return null;

  const whole = BigInt(decimalMatch[1]!);
  const decimals = (decimalMatch[2] ?? "").padEnd(2, "0");
  const cents = whole * BigInt(100) + BigInt(decimals || "0");
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

export function parseSinapiFractionToBasisPoints(
  value: unknown,
): number | null {
  let fraction: number;
  if (typeof value === "number") {
    fraction = value;
  } else if (typeof value === "string") {
    const normalized = value.trim();
    const percent = normalized.endsWith("%");
    const numberText = (percent ? normalized.slice(0, -1) : normalized)
      .trim()
      .replace(",", ".");
    if (!/^\d+(?:\.\d+)?$/.test(numberText)) return null;
    fraction = Number(numberText) / (percent ? 100 : 1);
  } else {
    return null;
  }

  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
  const basisPoints = Math.round(fraction * SINAPI_BASIS_POINTS_SCALE);
  return Math.abs(fraction * SINAPI_BASIS_POINTS_SCALE - basisPoints) < 1e-7
    ? basisPoints
    : null;
}

export function applySinapiAdjustment(
  costCents: number,
  adjustmentBasisPoints: number,
): number | null {
  if (
    !Number.isSafeInteger(costCents) ||
    costCents < 0 ||
    !Number.isInteger(adjustmentBasisPoints) ||
    adjustmentBasisPoints < 0 ||
    adjustmentBasisPoints > SINAPI_MAX_ADJUSTMENT_BASIS_POINTS
  ) {
    return null;
  }

  const numerator =
    BigInt(costCents) *
    BigInt(SINAPI_BASIS_POINTS_SCALE + adjustmentBasisPoints);
  const rounded =
    (numerator + BigInt(SINAPI_BASIS_POINTS_SCALE / 2)) /
    BigInt(SINAPI_BASIS_POINTS_SCALE);

  return rounded <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rounded) : null;
}
