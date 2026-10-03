import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { USDC_DECIMALS } from "./constants";

/** Programa Memo v2 de Solana. */
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/** USDC de devnet (Circle). Configurable con NEXT_PUBLIC_SOLANA_USDC_MINT. */
export const DEFAULT_USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZ6hZKqt";

export const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
export const usdcMint = process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || DEFAULT_USDC_DEVNET_MINT;

/** Memo que identifica el pago de una cuota; lo verificará el servidor en la etapa 9. */
export function paymentMemo(obligationId: bigint | string, number: number): string {
  return `cuotas:${obligationId}:${number}`;
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export type PaymentParams = {
  payer: PublicKey;
  /** Pubkey Solana del acreedor (`sellerSolanaAddress`). */
  seller: PublicKey;
  mint: PublicKey;
  /** Unidades mínimas de USDC (6 decimales), igual que `Installment.amount`. */
  amount: bigint;
  obligationId: bigint | string;
  number: number;
};

/**
 * Instrucciones del pago (sin red): 1) crear la ATA USDC del acreedor si no existe (la paga el deudor),
 * 2) transferChecked deudor → acreedor, 3) Memo `cuotas:<id>:<n>` firmado por el pagador.
 */
export function buildPaymentInstructions(p: PaymentParams): TransactionInstruction[] {
  const from = getAssociatedTokenAddressSync(p.mint, p.payer);
  const to = getAssociatedTokenAddressSync(p.mint, p.seller);
  return [
    createAssociatedTokenAccountIdempotentInstruction(p.payer, to, p.seller, p.mint),
    createTransferCheckedInstruction(from, p.mint, to, p.payer, p.amount, USDC_DECIMALS),
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: p.payer, isSigner: true, isWritable: false }],
      data: Buffer.from(paymentMemo(p.obligationId, p.number), "utf8"),
    }),
  ];
}

export function buildPaymentTransaction(p: PaymentParams, recentBlockhash: string): Transaction {
  const tx = new Transaction({ feePayer: p.payer, recentBlockhash });
  tx.add(...buildPaymentInstructions(p));
  return tx;
}
