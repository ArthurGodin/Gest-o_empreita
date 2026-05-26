import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateBR(date: Date | string): string {
  let d: Date;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Date-only ISO: parse como local midnight pra evitar UTC drift
    // que mostra dia anterior em servidores não-UTC.
    const [y, m, day] = date.split("-").map(Number) as [number, number, number];
    d = new Date(y, m - 1, day);
  } else {
    d = typeof date === "string" ? new Date(date) : date;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
