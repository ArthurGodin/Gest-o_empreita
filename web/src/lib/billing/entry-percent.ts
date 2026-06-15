export const ENTRY_PERCENT_ERROR = "Entrada deve ficar entre 0% e 100%.";
export const MIN_ASAAS_PIX_CHARGE_CENTS = 500;
export const MIN_ASAAS_PIX_CHARGE_LABEL = "R$ 5,00";

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

export function asaasChargeAmountValidationMessage(
  amountCents: number,
  label = "Cobrança Pix",
): string | null {
  const safeAmountCents = Math.max(0, Math.round(amountCents));
  return safeAmountCents > 0 && safeAmountCents < MIN_ASAAS_PIX_CHARGE_CENTS
    ? `${label} precisa ser de pelo menos ${MIN_ASAAS_PIX_CHARGE_LABEL}.`
    : null;
}

export function entryChargeValidationMessage(
  totalCents: number,
  entryPct: number | null | undefined,
): string | null {
  if (!isValidEntryPercent(entryPct)) return ENTRY_PERCENT_ERROR;

  const safeTotalCents = Math.max(0, Math.round(totalCents));
  if (safeTotalCents > 0 && safeTotalCents < MIN_ASAAS_PIX_CHARGE_CENTS) {
    return `Orçamento precisa ter pelo menos ${MIN_ASAAS_PIX_CHARGE_LABEL} para gerar Pix pelo Asaas.`;
  }

  const { entryCents, saldoCents } = calculateEntrySplit(
    safeTotalCents,
    entryPct,
  );

  if (entryCents > 0 && entryCents < MIN_ASAAS_PIX_CHARGE_CENTS) {
    return `Entrada Pix precisa ser de pelo menos ${MIN_ASAAS_PIX_CHARGE_LABEL}. Aumente a entrada ou use 0% para cobrar tudo depois.`;
  }

  if (saldoCents > 0 && saldoCents < MIN_ASAAS_PIX_CHARGE_CENTS) {
    return `Saldo Pix precisa ser de pelo menos ${MIN_ASAAS_PIX_CHARGE_LABEL}. Reduza a entrada ou use 100% para cobrar tudo agora.`;
  }

  return null;
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
