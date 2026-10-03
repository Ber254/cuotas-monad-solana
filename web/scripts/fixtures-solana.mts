// Fixture: tx de Solana en formato `jsonParsed` (como la devuelve getParsedTransaction).
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";

export const SIG = process.env.MOCK_SIG ?? "5".repeat(88);
export function parsedPaymentTx(o: {
  mint: string; seller: string; amount: bigint; obligationId: string; number: number;
  payer?: string; memo?: string; destination?: string; decimals?: number; err?: unknown; noMemo?: boolean;
}): ParsedTransactionWithMeta {
  const payer = o.payer ?? Keypair.generate().publicKey.toBase58();
  const mint = new PublicKey(o.mint);
  const dest = o.destination ?? getAssociatedTokenAddressSync(mint, new PublicKey(o.seller)).toBase58();
  const src = getAssociatedTokenAddressSync(mint, new PublicKey(payer)).toBase58();
  const ixs: unknown[] = [
    { program: "spl-associated-token-account", programId: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), parsed: { type: "createIdempotent", info: {} } },
    { program: "spl-token", programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      parsed: { type: "transferChecked", info: { source: src, destination: dest, mint: o.mint, authority: payer, tokenAmount: { amount: o.amount.toString(), decimals: o.decimals ?? 6, uiAmount: 0, uiAmountString: "0" } } } },
  ];
  if (!o.noMemo) ixs.push({ program: "spl-memo", programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), parsed: o.memo ?? `cuotas:${o.obligationId}:${o.number}` });
  return { slot: 1, blockTime: 0, version: "legacy", meta: { err: o.err ?? null, fee: 5000, preBalances: [], postBalances: [], innerInstructions: [] }, transaction: { signatures: [SIG], message: { accountKeys: [], instructions: ixs, recentBlockhash: "" } } } as unknown as ParsedTransactionWithMeta;
}
