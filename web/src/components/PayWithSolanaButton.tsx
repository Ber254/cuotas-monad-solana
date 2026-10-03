"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { payInstallmentWithSolana, solanaErrorMessage } from "@/lib/phantom";
import { explorerTxUrl, paymentMemo } from "@/lib/solana";

/** Pide al servidor verificar el pago en Solana y registrarlo en Monad; reintenta si el RPC aún no ve la tx. */
async function confirmOnServer(obligationId: string, number: number, signature: string): Promise<void> {
  let last = "No se pudo confirmar el pago.";
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ obligationId, number, signature }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; retryable?: boolean };
    if (res.ok) return;
    last = body.error ?? last;
    if (!body.retryable) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(last);
}

/**
 * Paga una cuota con USDC en Solana (Phantom) y pide al servidor que verifique el pago: si es válido,
 * el servidor marca la cuota PAID en Monad (etapa 9).
 */
export function PayWithSolanaButton(props: {
  obligationId: string;
  number: number;
  amount: string; // bigint serializado (unidades mínimas)
  sellerSolanaAddress: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState<string>();
  const [error, setError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();

  async function verify(sig: string) {
    setBusy(true);
    setConfirmError(undefined);
    try {
      await confirmOnServer(props.obligationId, props.number, sig);
      router.refresh();
    } catch (e) {
      setConfirmError(solanaErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onPay() {
    setBusy(true);
    setError(undefined);
    let sig: string;
    try {
      sig = await payInstallmentWithSolana({
        sellerSolanaAddress: props.sellerSolanaAddress,
        amount: BigInt(props.amount),
        obligationId: BigInt(props.obligationId),
        number: props.number,
      });
    } catch (e) {
      setError(solanaErrorMessage(e));
      setBusy(false);
      return;
    }
    setSignature(sig);
    await verify(sig);
  }

  if (signature) {
    return (
      <div className="text-xs space-y-1" data-testid="sol-sent">
        <div className="text-green-300">Pago enviado en Solana</div>
        <a className="underline break-all" href={explorerTxUrl(signature)} target="_blank" data-testid="sol-signature">
          {signature.slice(0, 12)}…
        </a>
        <div className="text-white/50">Memo: {paymentMemo(props.obligationId, props.number)}</div>
        {busy && <div className="text-white/70">Verificando el pago y registrándolo en Monad…</div>}
        {confirmError && (
          <div className="space-y-1">
            <div className="text-red-300" data-testid="confirm-error">
              {confirmError}
            </div>
            <button type="button" onClick={() => verify(signature)} className="underline" data-testid="retry-verify">
              Reintentar verificación (no vuelve a cobrar)
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onPay}
        disabled={busy}
        className="rounded bg-purple-600 px-2 py-1 text-xs font-semibold disabled:opacity-40"
        data-testid="pay-solana"
      >
        {busy ? "Pagando…" : "Pagar con Solana"}
      </button>
      {error && (
        <div className="text-xs text-red-300" data-testid="pay-solana-error">
          {error}
        </div>
      )}
    </div>
  );
}
