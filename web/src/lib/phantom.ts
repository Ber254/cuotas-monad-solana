import { Connection, PublicKey, type Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { buildPaymentTransaction, solanaRpcUrl, usdcMint } from "./solana";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

function getPhantom(): PhantomProvider {
  if (!window.solana) throw new Error("No se detectó Phantom (instalá la extensión y usá devnet).");
  return window.solana;
}

/**
 * Paga una cuota: transferencia USDC (devnet) a la ATA del acreedor + memo. Devuelve la firma.
 * NO marca la cuota como PAID: eso lo hará la verificación server-side (etapa 9).
 */
export async function payInstallmentWithSolana(args: {
  sellerSolanaAddress: string;
  amount: bigint;
  obligationId: bigint;
  number: number;
}): Promise<string> {
  let seller: PublicKey;
  try {
    seller = new PublicKey(args.sellerSolanaAddress);
    getAssociatedTokenAddressSync(new PublicKey(usdcMint), seller); // falla si está fuera de curva
  } catch {
    throw new Error("La cuenta Solana del acreedor registrada en la obligación no es una wallet válida.");
  }
  const phantom = getPhantom();
  const { publicKey: payer } = await phantom.connect();
  const mint = new PublicKey(usdcMint);
  const connection = new Connection(solanaRpcUrl, "confirmed");

  const from = getAssociatedTokenAddressSync(mint, payer);
  try {
    const bal = await connection.getTokenAccountBalance(from);
    if (BigInt(bal.value.amount) < args.amount) throw new Error("INSUFFICIENT");
  } catch (e) {
    throw new Error(
      (e as Error).message === "INSUFFICIENT" ? "Saldo de USDC devnet insuficiente para esta cuota." : "Tu wallet no tiene USDC devnet (¿mint correcto y red devnet?).",
    );
  }

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const tx = buildPaymentTransaction({ payer, seller, mint, ...args }, blockhash);
  const { signature } = await phantom.signAndSendTransaction(tx);
  await waitForConfirmation(connection, signature);
  return signature;
}

/** Polling HTTP (sin websockets) hasta que la tx esté confirmada o falle. */
async function waitForConfirmation(connection: Connection, signature: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const st = value[0];
    if (st?.err) throw new Error("La transacción de Solana falló.");
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Tiempo agotado esperando la confirmación en Solana (la tx puede haberse enviado igual: revisá el explorer).");
}

export function solanaErrorMessage(e: unknown): string {
  const err = e as { code?: number; message?: string };
  if (err.code === 4001) return "Rechazaste la operación en Phantom.";
  return err.message?.split("\n")[0] ?? "Error desconocido.";
}
