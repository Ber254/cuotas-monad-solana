import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./constants";
import type { Lang } from "./i18n";

const LOCALE: Record<Lang, string> = { es: "es-AR", en: "en-US" };

/** Monto en unidades mínimas USDC (6 decimales) → "1.000" (es-AR). */
export function formatUsdc(amount: bigint, lang: Lang = "es"): string {
  return Number(formatUnits(amount, USDC_DECIMALS)).toLocaleString(LOCALE[lang], { maximumFractionDigits: 6 });
}

/** Unix seconds → fecha legible es-AR (hora de Buenos Aires). */
export function formatDate(unixSeconds: bigint | number, lang: Lang = "es"): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString(LOCALE[lang], {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function shortAddress(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
