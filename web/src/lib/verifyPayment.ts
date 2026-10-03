import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { USDC_DECIMALS } from "./constants";
import { paymentMemo } from "./solana";

export type ExpectedPayment = {
  mint: string;
  /** Pubkey Solana del acreedor (`sellerSolanaAddress`); el destino esperado es su ATA USDC. */
  sellerSolanaAddress: string;
  /** Unidades mínimas de USDC; se acepta un monto mayor o igual. */
  amount: bigint;
  obligationId: bigint | string;
  number: number;
};

export type VerifyResult = { ok: true; payer: string } | { ok: false; reason: string };

/**
 * Verifica (sin red) que una tx de Solana ya obtenida con `jsonParsed` sea el pago de la cuota:
 * confirmada sin error, `transferChecked` del mint esperado hacia la ATA del acreedor por el monto
 * (≥) con 6 decimales, y memo exacto `cuotas:<id>:<n>` (D5, D18).
 */
export function verifyPaymentTx(tx: ParsedTransactionWithMeta | null, exp: ExpectedPayment): VerifyResult {
  if (!tx) return { ok: false, reason: "Transacción no encontrada." };
  if (!tx.meta) return { ok: false, reason: "La transacción no tiene metadatos." };
  if (tx.meta.err) return { ok: false, reason: "La transacción de Solana falló." };

  let destination: string;
  try {
    destination = getAssociatedTokenAddressSync(new PublicKey(exp.mint), new PublicKey(exp.sellerSolanaAddress)).toBase58();
  } catch {
    return { ok: false, reason: "La cuenta Solana del acreedor registrada no es válida." };
  }
  const memo = paymentMemo(exp.obligationId, exp.number);

  let payer: string | undefined;
  let transferOk = false;
  let memoOk = false;
  for (const ix of tx.transaction.message.instructions) {
    if (!("parsed" in ix)) continue;
    if (ix.program === "spl-memo" && ix.parsed === memo) memoOk = true;
    if (ix.program === "spl-token" && ix.parsed?.type === "transferChecked") {
      const info = ix.parsed.info;
      if (
        info.mint === exp.mint &&
        info.destination === destination &&
        info.tokenAmount?.decimals === USDC_DECIMALS &&
        BigInt(info.tokenAmount.amount) >= exp.amount
      ) {
        transferOk = true;
        payer = info.authority ?? info.multisigAuthority;
      }
    }
  }
  if (!transferOk) return { ok: false, reason: "No hay una transferencia USDC válida (mint, destino o monto) hacia el acreedor." };
  if (!memoOk) return { ok: false, reason: `Falta el memo exacto "${memo}".` };
  return { ok: true, payer: payer ?? "" };
}
