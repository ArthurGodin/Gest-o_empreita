export const ENTRY_PERCENT_ERROR = "Entrada deve ficar entre 0% e 100%.";

export function parseEntryPercentInput(
  value: string | number | null | undefined,
): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = (value ?? "").trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidEntryPercent(
  value: number | null | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

export function entryPercentValidationMessage(
  value: number | null | undefined,
): string | null {
  return isValidEntryPercent(value) ? null : ENTRY_PERCENT_ERROR;
}

export function calculateEntrySplit(totalCents: number, entryPct: number) {
  if (!isValidEntryPercent(entryPct)) {
    throw new RangeError(ENTRY_PERCENT_ERROR);
  }

  const safeTotalCents = Math.max(0, Math.round(totalCents));
  const entryCents = Math.round((safeTotalCents * entryPct) / 100);

  return {
    entryCents,
    saldoCents: safeTotalCents - entryCents,
  };
}
