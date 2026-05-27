import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLitri(n: number): string {
  return n.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " L";
}

export function formatBottiglie(n: number): string {
  return n.toLocaleString("it-IT", { maximumFractionDigits: 0 }) + " bt";
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function litriToBottiglie(litri: number): number {
  return Math.floor(litri / 0.75);
}

export function bottiglieToLitri(bottiglie: number): number {
  return bottiglie * 0.75;
}

export function percentuale(parte: number, totale: number): number {
  if (totale === 0) return 0;
  return Math.round((parte / totale) * 100);
}
