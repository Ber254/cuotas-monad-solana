import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import { verifyPaymentTx } from "./verifyPayment";

export type ConfirmInput = Partial<Record<"obligationId" | "number" | "signature", unknown>>;

export type ConfirmDeps = {
  /** Lee obligación y cuotas de Monad; `null` si no existe. */
  readObligation: (id: bigint) => Promise<{
    sellerSolanaAddress: string;
    installments: { number: number; amount: bigint; status: string }[];
  } | null>;
  fetchSolanaTx: (signature: string) => Promise<ParsedTransactionWithMeta | null>;
  /** Envía `markInstallmentPaid` como verifier. Debe lanzar un Error con `.name` = error del contrato. */
  markPaid: (id: bigint, number: number, signature: string) => Promise<string>;
  usdcMint: string;
};

export type ConfirmResult = { status: number; body: Record<string, unknown> };

const BASE58_SIG = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

/** Lógica del endpoint /api/payments/confirm, sin dependencias de Next (testeable). */
export async function confirmPayment(input: ConfirmInput, deps: ConfirmDeps): Promise<ConfirmResult> {
  const idStr = String(input.obligationId ?? "");
  const num = Number(input.number);
  const sig = typeof input.signature === "string" ? input.signature : "";
  if (!/^[1-9][0-9]*$/.test(idStr) || !Number.isInteger(num) || num < 1 || num > 255 || !BASE58_SIG.test(sig)) {
    return { status: 400, body: { error: "Parámetros inválidos (obligationId, number, signature)." } };
  }
  const id = BigInt(idStr);

  const data = await deps.readObligation(id);
  if (!data) return { status: 404, body: { error: "La obligación no existe." } };
  const inst = data.installments.find((i) => i.number === num);
  if (!inst) return { status: 404, body: { error: "La cuota no existe." } };
  if (inst.status === "PAID") return { status: 409, body: { error: "La cuota ya está pagada." } };

  const tx = await deps.fetchSolanaTx(sig);
  if (!tx) return { status: 404, body: { error: "Transacción no encontrada o todavía no confirmada en Solana.", retryable: true } };

  const result = verifyPaymentTx(tx, {
    mint: deps.usdcMint,
    sellerSolanaAddress: data.sellerSolanaAddress,
    amount: inst.amount,
    obligationId: id,
    number: num,
  });
  if (!result.ok) return { status: 422, body: { error: result.reason } };

  try {
    const monadTx = await deps.markPaid(id, num, sig);
    return { status: 200, body: { ok: true, monadTx, paymentRef: sig } };
  } catch (e) {
    const name = (e as Error).name;
    if (name === "AlreadyPaid" || name === "PaymentRefAlreadyUsed")
      return { status: 409, body: { error: name === "AlreadyPaid" ? "La cuota ya está pagada." : "Esa firma ya se usó para otro pago." } };
    return { status: 502, body: { error: `No se pudo registrar el pago en Monad: ${(e as Error).message.split("\n")[0]}` } };
  }
}
