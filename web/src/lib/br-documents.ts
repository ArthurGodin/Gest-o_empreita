export function normalizeCpfCnpj(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidCpfCnpj(value: string | null | undefined): boolean {
  const digits = normalizeCpfCnpj(value);
  if (digits.length === 11) return isValidCpfDigits(digits);
  if (digits.length === 14) return isValidCnpjDigits(digits);
  return false;
}

function hasRepeatedDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function isValidCpfDigits(digits: string): boolean {
  if (digits.length !== 11 || hasRepeatedDigits(digits)) return false;

  const firstDigit = cpfCheckDigit(digits.slice(0, 9), 10);
  const secondDigit = cpfCheckDigit(digits.slice(0, 9) + firstDigit, 11);

  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function cpfCheckDigit(base: string, startWeight: number): number {
  const sum = base
    .split("")
    .reduce(
      (acc, digit, index) => acc + Number(digit) * (startWeight - index),
      0,
    );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function isValidCnpjDigits(digits: string): boolean {
  if (digits.length !== 14 || hasRepeatedDigits(digits)) return false;

  const firstDigit = cnpjCheckDigit(digits.slice(0, 12), [
    5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  const secondDigit = cnpjCheckDigit(digits.slice(0, 12) + firstDigit, [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);

  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function cnpjCheckDigit(base: string, weights: number[]): number {
  const sum = base
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index]!, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
