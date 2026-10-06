"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { PayWithSolanaButton } from "@/components/PayWithSolanaButton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatUsdc, shortAddress } from "@/lib/format";
import { isSolanaWallet } from "@/lib/obligationForm";
import type { InstallmentStatus } from "@/lib/registry";
import { explorerTxUrl, isSolanaSignature } from "@/lib/solana";
import { useAccount } from "@/lib/useAccount";
import { connectWallet, errorMessage, sendTransferInstallments } from "@/lib/wallet";

/** Fila serializable (los bigint llegan como string desde el Server Component). */
export type InstallmentRow = {
  number: number;
  amount: string;
  dueDate: string;
  status: InstallmentStatus;
  paidAt: string;
  paymentRef: string;
  creditor: Address;
  creditorSolanaAddress: string;
};

export function InstallmentsTable({
  obligationId,
  buyer,
  seller,
  rows,
}: {
  obligationId: string;
  buyer: Address;
  seller: Address;
  rows: InstallmentRow[];
}) {
  const router = useRouter();
  const account = useAccount();
  const [selected, setSelected] = useState<number[]>([]);
  const [newCreditor, setNewCreditor] = useState("");
  const [newSolana, setNewSolana] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const mine = (r: InstallmentRow) => !!account && r.creditor.toLowerCase() === account.toLowerCase();
  const ceable = rows.filter((r) => r.status !== "PAID" && mine(r));
  const selectedValid = selected.filter((n) => ceable.some((r) => r.number === n));

  const addrOk = isAddress(newCreditor.trim(), { strict: false });
  const problems: string[] = [];
  if (newCreditor && !addrOk) problems.push("La dirección del nuevo acreedor no es válida.");
  if (addrOk && newCreditor.trim().toLowerCase() === buyer.toLowerCase()) problems.push("El nuevo acreedor no puede ser el deudor (PYME).");
  if (addrOk && account && newCreditor.trim().toLowerCase() === account.toLowerCase()) problems.push("El nuevo acreedor no puede ser vos mismo.");
  if (newSolana && !isSolanaWallet(newSolana.trim())) problems.push("La cuenta Solana del nuevo acreedor debe ser una wallet válida (no una cuenta PDA/programa).");
  const canSubmit = !!account && selectedValid.length > 0 && addrOk && !!newSolana.trim() && problems.length === 0 && !busy;

  const toggle = (n: number) => setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  async function onConnect() {
    setError(undefined);
    try {
      await connectWallet();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function onCede() {
    if (!account) return;
    setBusy(true);
    setError(undefined);
    setDone(undefined);
    try {
      const hash = await sendTransferInstallments(
        account,
        BigInt(obligationId),
        [...selectedValid].sort((a, b) => a - b),
        getAddress(newCreditor.trim().toLowerCase()),
        newSolana.trim(),
      );
      setDone(hash);
      setSelected([]);
      setNewCreditor("");
      setNewSolana("");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Pagarés (cuotas)</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="text-left text-white/60">
            <tr className="border-b border-white/15">
              <th className="py-2 pr-3">N°</th>
              <th>Monto (USDC)</th>
              <th>Vencimiento</th>
              <th>Estado (Monad)</th>
              <th>Acreedor</th>
              <th>Pagada el</th>
              <th>Pago (Solana)</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const ceded = i.creditor.toLowerCase() !== seller.toLowerCase();
              return (
                <tr key={i.number} className="border-b border-white/5" data-testid="installment-row">
                  <td className="py-2 pr-3">
                    {i.status !== "PAID" && mine(i) ? (
                      <label className="flex items-center gap-2" title="Seleccionar para ceder">
                        <input type="checkbox" checked={selected.includes(i.number)} onChange={() => toggle(i.number)} data-testid="cede-select" />
                        {i.number}
                      </label>
                    ) : (
                      i.number
                    )}
                  </td>
                  <td>{formatUsdc(BigInt(i.amount))}</td>
                  <td>{formatDate(BigInt(i.dueDate))}</td>
                  <td>
                    <StatusBadge status={i.status} testId="installment-status" />
                  </td>
                  <td className="font-mono text-xs" data-testid="installment-creditor" title={i.creditor}>
                    {shortAddress(i.creditor)}
                    {ceded && <span className="ml-1 rounded bg-purple-500/20 px-1 text-purple-200" data-testid="ceded-badge">cedido</span>}
                    {mine(i) && <span className="ml-1 text-white/50">(vos)</span>}
                  </td>
                  <td>{BigInt(i.paidAt) > BigInt(0) ? formatDate(BigInt(i.paidAt)) : "—"}</td>
                  <td className="font-mono break-all" data-testid="payment-ref" title={i.paymentRef}>
                    {isSolanaSignature(i.paymentRef) ? (
                      <a className="underline" href={explorerTxUrl(i.paymentRef)} target="_blank" data-testid="payment-ref-link">
                        {i.paymentRef.slice(0, 12)}…
                      </a>
                    ) : (
                      i.paymentRef || "—"
                    )}
                  </td>
                  <td>
                    {i.status !== "PAID" && (
                      <div className="space-y-2">
                        <PayWithSolanaButton
                          obligationId={obligationId}
                          number={i.number}
                          amount={i.amount}
                          sellerSolanaAddress={i.creditorSolanaAddress}
                        />
                        <MarkPaidButton obligationId={obligationId} number={i.number} creditor={i.creditor} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {account && ceable.length > 0 && (
        <div className="rounded border border-purple-400/30 bg-purple-500/5 p-4 space-y-3 text-sm" data-testid="cede-panel">
          <div className="font-semibold text-purple-200">Ceder pagarés a otro acreedor</div>
          <p className="text-white/70">
            Marcá en la tabla los pagarés que querés ceder ({selectedValid.length} seleccionados de {ceable.length} que son tuyos). Desde la
            cesión, el deudor paga a la cuenta Solana del nuevo acreedor y solo él (o el verificador) puede marcarlos pagados. El precio de la
            cesión se acuerda aparte: acá no se mueve dinero.
          </p>
          <label className="block space-y-1">
            <span>Dirección EVM del nuevo acreedor</span>
            <input
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 font-mono text-sm"
              value={newCreditor}
              onChange={(e) => setNewCreditor(e.target.value)}
              name="newCreditor"
              placeholder="0x…"
            />
          </label>
          <label className="block space-y-1">
            <span>Cuenta Solana del nuevo acreedor (donde cobrará los USDC)</span>
            <input
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 font-mono text-sm"
              value={newSolana}
              onChange={(e) => setNewSolana(e.target.value)}
              name="newCreditorSolana"
              placeholder="pubkey base58"
            />
          </label>
          {problems.length > 0 && (
            <ul className="list-disc pl-5 text-amber-300" data-testid="cede-problems">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onCede}
            disabled={!canSubmit}
            className="rounded bg-purple-600 px-4 py-2 font-semibold disabled:opacity-40"
            data-testid="cede-submit"
          >
            {busy ? "Esperando confirmación…" : `Ceder ${selectedValid.length} pagaré${selectedValid.length === 1 ? "" : "s"}`}
          </button>
          {error && <p className="text-red-300" data-testid="cede-error">{error}</p>}
          {done && <p className="text-green-300" data-testid="cede-done">Cesión registrada en Monad. Transacción: {done}</p>}
        </div>
      )}
      {!account && (
        <button type="button" onClick={onConnect} className="text-xs underline text-white/60" data-testid="table-connect">
          Conectar wallet para ver tus pagarés y poder ceder
        </button>
      )}
      {error && !ceable.length && <p className="text-red-300 text-sm">{error}</p>}

      <p className="text-xs text-white/50">
        OVERDUE se calcula al leer (impaga y vencida); no se guarda on-chain. El pago con USDC en Solana se envía con Phantom (devnet) y el
        servidor verifica la tx (mint, destino = cuenta del acreedor ACTUAL de ese pagaré, monto, memo) antes de marcar la cuota PAID en
        Monad. La confirmación manual del acreedor sigue disponible como respaldo.
      </p>
    </section>
  );
}
