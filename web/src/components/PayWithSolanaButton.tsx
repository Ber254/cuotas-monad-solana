"use client";

import { useState } from "react";
import { payInstallmentWithSolana, solanaErrorMessage } from "@/lib/phantom";
import { explorerTxUrl, paymentMemo } from "@/lib/solana";

/**
 * Paga una cuota con USDC en Solana (Phantom). Solo envía la transferencia con memo; la cuota sigue
 * PENDING hasta que el servidor verifique el pago (etapa 9).
 */
export function PayWithSolanaButton(props: {
  obligationId: string;
  number: number;
  amount: string; // bigint serializado (unidades mínimas)
  sellerSolanaAddress: string;
}) {
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState<string>();
  const [error, setError] = useState<string>();

  async function onPay() {
    setBusy(true);
    setError(undefined);
    try {
      setSignature(
        await payInstallmentWithSolana({
          sellerSolanaAddress: props.sellerSolanaAddress,
          amount: BigInt(props.amount),
          obligationId: BigInt(props.obligationId),
          number: props.number,
        }),
      );
    } catch (e) {
      setError(solanaErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (signature) {
    return (
      <div className="text-xs space-y-1" data-testid="sol-sent">
        <div className="text-green-300">Pago enviado en Solana</div>
        <a className="underline break-all" href={explorerTxUrl(signature)} target="_blank" data-testid="sol-signature">
          {signature.slice(0, 12)}…
        </a>
        <div className="text-white/50">Pendiente de verificación (etapa 9). Memo: {paymentMemo(props.obligationId, props.number)}</div>
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
