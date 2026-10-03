"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import { chain, registryAddress } from "@/lib/monad";
import { formatDate, formatUsdc, shortAddress } from "@/lib/format";
import { parseObligationForm, type ObligationFormValues } from "@/lib/obligationForm";
import { connectWallet, errorMessage, sendCreateObligation } from "@/lib/wallet";

function defaultFirstDue(): string {
  return new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10);
}

const inputClass = "w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm";

export default function NewObligationPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Address>();
  const [busy, setBusy] = useState(false);
  const [txError, setTxError] = useState<string>();
  const [values, setValues] = useState<ObligationFormValues>({
    description: "Capital de trabajo PYME",
    buyer: "",
    sellerSolanaAddress: "",
    totalUsdc: "10000",
    installmentCount: "10",
    firstDueDate: defaultFirstDue(),
    intervalDays: "30",
  });

  const set = (k: keyof ObligationFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const parsed = useMemo(() => parseObligationForm(values, account, Math.floor(Date.now() / 1000)), [values, account]);

  async function onConnect() {
    setTxError(undefined);
    try {
      setAccount(await connectWallet());
    } catch (e) {
      setTxError(errorMessage(e));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok || !account) return;
    setBusy(true);
    setTxError(undefined);
    try {
      const id = await sendCreateObligation(account, parsed.args);
      router.push(`/obligations/${id}`);
    } catch (err) {
      setTxError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <Link href="/" className="text-sm text-white/60 hover:underline">
        ← Volver
      </Link>
      <h1 className="text-2xl font-bold">Nueva obligación</h1>
      <p className="text-sm text-white/60">
        La firma la wallet del <b>acreedor/inversor</b> en {chain.name}; se registra la obligación y se generan
        todas las cuotas. El pago de cada cuota será en USDC sobre Solana.
      </p>

      {!registryAddress && <p className="text-red-300">NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada.</p>}

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={onConnect}
          className="rounded bg-white/10 px-3 py-2 hover:bg-white/20"
          data-testid="connect-wallet"
        >
          {account ? "Cambiar cuenta" : "Conectar wallet"}
        </button>
        <span data-testid="account" className="font-mono">
          {account ? `Acreedor: ${shortAddress(account)}` : "Wallet no conectada"}
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span>Descripción</span>
          <input className={inputClass} value={values.description} onChange={set("description")} name="description" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Dirección EVM de la PYME deudora (paga las cuotas)</span>
          <input className={inputClass} value={values.buyer} onChange={set("buyer")} name="buyer" placeholder="0x…" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Cuenta Solana del acreedor (recibe los USDC)</span>
          <input
            className={inputClass}
            value={values.sellerSolanaAddress}
            onChange={set("sellerSolanaAddress")}
            name="sellerSolanaAddress"
            placeholder="pubkey base58"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="block space-y-1 text-sm">
            <span>Monto total (USDC)</span>
            <input className={inputClass} value={values.totalUsdc} onChange={set("totalUsdc")} name="totalUsdc" inputMode="decimal" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Cuotas</span>
            <input className={inputClass} value={values.installmentCount} onChange={set("installmentCount")} name="installmentCount" inputMode="numeric" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Primer vencimiento</span>
            <input type="date" className={inputClass} value={values.firstDueDate} onChange={set("firstDueDate")} name="firstDueDate" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Intervalo (días)</span>
            <input className={inputClass} value={values.intervalDays} onChange={set("intervalDays")} name="intervalDays" inputMode="numeric" />
          </label>
        </div>

        {!parsed.ok && (
          <ul className="list-disc pl-5 text-sm text-amber-300" data-testid="form-errors">
            {parsed.errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        {parsed.ok && (
          <section className="space-y-2" data-testid="preview">
            <h2 className="font-semibold">
              Vista previa: {parsed.args[4]} × {formatUsdc(parsed.args[3])} USDC
            </h2>
            <ol className="grid grid-cols-2 gap-x-6 text-sm text-white/70 sm:grid-cols-3">
              {parsed.schedule.map((s) => (
                <li key={s.number} data-testid="preview-row">
                  Cuota {s.number}: {formatDate(s.dueDate)}
                </li>
              ))}
            </ol>
          </section>
        )}

        {txError && (
          <p className="text-sm text-red-300" data-testid="tx-error">
            {txError}
          </p>
        )}

        <button
          type="submit"
          disabled={!parsed.ok || !account || busy || !registryAddress}
          className="rounded bg-green-600 px-4 py-2 font-semibold disabled:opacity-40"
          data-testid="submit"
        >
          {busy ? "Esperando confirmación…" : "Crear obligación"}
        </button>
        {!account && <p className="text-xs text-white/50">Conectá la wallet del acreedor para poder crear.</p>}
      </form>
    </main>
  );
}
