import { getAddress, isAddress, parseUnits, type Address } from "viem";
import { MAX_INSTALLMENTS, SECONDS_PER_DAY, USDC_DECIMALS } from "./constants";

/** Valores crudos del formulario (strings tal como los escribe el usuario). */
export type ObligationFormValues = {
  description: string;
  /** Dirección EVM de la PYME deudora. */
  buyer: string;
  /** Pubkey Solana (base58) del acreedor, donde recibe los USDC. */
  sellerSolanaAddress: string;
  /** Monto total a financiar, en USDC (ej. "10000" o "10000.50"). */
  totalUsdc: string;
  installmentCount: string;
  /** YYYY-MM-DD */
  firstDueDate: string;
  intervalDays: string;
};

export type CreateObligationArgs = readonly [string, Address, string, bigint, number, bigint, bigint];

export type ParsedObligation =
  | { ok: true; args: CreateObligationArgs; schedule: { number: number; dueDate: bigint }[] }
  | { ok: false; errors: string[] };

const BASE58_PUBKEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Valida el formulario con las mismas reglas que el contrato (`InvalidParams`) y arma los
 * argumentos de `createObligation`. `account` es el acreedor que firma (msg.sender).
 * `nowSeconds` se inyecta para poder testear.
 */
export function parseObligationForm(
  v: ObligationFormValues,
  account: string | undefined,
  nowSeconds: number,
): ParsedObligation {
  const errors: string[] = [];

  const description = v.description.trim();
  if (!description) errors.push("Ingresá una descripción.");

  let buyer: Address | undefined;
  if (!isAddress(v.buyer.trim(), { strict: false })) {
    errors.push("La dirección EVM de la PYME deudora no es válida.");
  } else {
    buyer = getAddress(v.buyer.trim().toLowerCase());
    if (/^0x0{40}$/.test(buyer.toLowerCase())) errors.push("La PYME deudora no puede ser la dirección cero.");
    else if (account && buyer.toLowerCase() === account.toLowerCase())
      errors.push("La PYME deudora no puede ser la misma wallet que crea la obligación (acreedor).");
  }

  const solana = v.sellerSolanaAddress.trim();
  if (!BASE58_PUBKEY.test(solana)) errors.push("La cuenta Solana del acreedor debe ser una pubkey base58 (32–44 caracteres).");

  let count = 0;
  if (!/^\d+$/.test(v.installmentCount.trim())) errors.push("La cantidad de cuotas debe ser un entero.");
  else {
    count = Number(v.installmentCount.trim());
    if (count < 1 || count > MAX_INSTALLMENTS) errors.push(`La cantidad de cuotas debe estar entre 1 y ${MAX_INSTALLMENTS}.`);
  }

  let total: bigint | undefined;
  if (!/^\d+(\.\d{1,6})?$/.test(v.totalUsdc.trim())) errors.push("El monto total debe ser un número positivo con hasta 6 decimales.");
  else {
    total = parseUnits(v.totalUsdc.trim(), USDC_DECIMALS);
    if (total <= BigInt(0)) errors.push("El monto total debe ser mayor a 0.");
  }

  let amount: bigint | undefined;
  if (total && count >= 1 && count <= MAX_INSTALLMENTS) {
    if (total % BigInt(count) !== BigInt(0)) errors.push("El monto total debe dividirse exacto entre las cuotas (sin centésimas de USDC sobrantes).");
    else amount = total / BigInt(count);
  }

  let firstDue = 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.firstDueDate)) errors.push("Ingresá la fecha del primer vencimiento.");
  else {
    // Mediodía UTC: la fecha se ve igual en cualquier zona horaria.
    firstDue = Math.floor(Date.parse(`${v.firstDueDate}T12:00:00Z`) / 1000);
    if (Number.isNaN(firstDue) || firstDue <= nowSeconds) {
      errors.push("El primer vencimiento debe ser una fecha futura.");
      firstDue = 0;
    }
  }

  let intervalSeconds = 0;
  if (!/^\d+$/.test(v.intervalDays.trim())) errors.push("El intervalo debe ser un entero de días.");
  else {
    const days = Number(v.intervalDays.trim());
    if (days < 1 && count > 1) errors.push("Con más de una cuota el intervalo debe ser de al menos 1 día.");
    intervalSeconds = days * SECONDS_PER_DAY;
  }

  if (errors.length || !buyer || !amount || !firstDue) return { ok: false, errors };

  const schedule = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    dueDate: BigInt(firstDue + i * intervalSeconds),
  }));
  return {
    ok: true,
    args: [description, buyer, solana, amount, count, BigInt(firstDue), BigInt(intervalSeconds)],
    schedule,
  };
}
