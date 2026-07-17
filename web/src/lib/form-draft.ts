export function formDraftSignature<T>(value: T): string {
  return JSON.stringify(value);
}

export function formDraftChanged<T>(current: T, savedSignature: string): boolean {
  return formDraftSignature(current) !== savedSignature;
}

export function formatSavedTime(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
