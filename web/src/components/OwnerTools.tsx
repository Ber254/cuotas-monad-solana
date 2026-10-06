"use client";

import { useCallback, useEffect, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { installmentRegistryAbi } from "@/lib/abi";
import { chain, explorerUrl, publicClient, registryAddress } from "@/lib/monad";
import { connectWallet, errorMessage, sendSetVerifier } from "@/lib/wallet";

const ZERO = "0x0000000000000000000000000000000000000000";

export function OwnerTools() {
  const [account, setAccount] = useState<Address>();
  const [owner, setOwner] = useState<Address>();
  const [verifier, setVerifier] = useState<Address>();
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const refresh = useCallback(async () => {
    if (!registryAddress) return;
    const read = (functionName: "owner" | "verifier") =>
      publicClient.readContract({ address: registryAddress!, abi: installmentRegistryAbi, functionName });
    const [o, v] = await Promise.all([read("owner"), read("verifier")]);
    setOwner(o);
    setVerifier(v);
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(errorMessage(e)));
  }, [refresh]);

  const valid = isAddress(next.trim(), { strict: false }) && next.trim().toLowerCase() !== ZERO;
  const isOwner = !!account && !!owner && account.toLowerCase() === owner.toLowerCase();
  const sameAsOwner = valid && !!owner && next.trim().toLowerCase() === owner.toLowerCase();

  async function onConnect() {
    setError(undefined);
    try {
      setAccount(await connectWallet());
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function onSubmit() {
    if (!account) return;
    setBusy(true);
    setError(undefined);
    setDone(undefined);
    try {
      const hash = await sendSetVerifier(account, getAddress(next.trim().toLowerCase()));
      await refresh();
      setDone(hash);
      setNext("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8 space-y-5" data-testid="owner-tools">
      <h1 className="text-xl font-bold">Cambiar el verifier del contrato</h1>
      <p className="text-sm text-white/70">
        Herramienta del <b>owner</b> en {chain.name}. Firmás con tu wallet; no hace falta exportar ninguna clave. El
        verifier es la cuenta que el servidor usa para marcar cuotas como pagadas.
      </p>
      <dl className="rounded border border-white/15 p-3 text-sm space-y-1 font-mono break-all">
        <div><span className="text-white/50">Contrato: </span>{registryAddress ?? "—"}</div>
        <div><span className="text-white/50">Owner: </span><span data-testid="owner">{owner ?? "…"}</span></div>
        <div><span className="text-white/50">Verifier actual: </span><span data-testid="verifier">{verifier ?? "…"}</span></div>
      </dl>

      <button type="button" onClick={onConnect} className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20" data-testid="connect">
        {account ? "Cambiar cuenta" : "Conectar wallet"}
      </button>
      {account && (
        <span className="ml-3 text-sm font-mono" data-testid="connected">
          {account} {isOwner ? "(owner ✓)" : "(NO es el owner)"}
        </span>
      )}

      <label className="block space-y-1 text-sm">
        <span>Dirección de la nueva wallet verifier</span>
        <input
          className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 font-mono text-sm"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="0x…"
          name="newVerifier"
        />
      </label>
      {next && !valid && <p className="text-sm text-amber-300" data-testid="invalid">Dirección inválida.</p>}
      {sameAsOwner && (
        <p className="text-sm text-amber-300" data-testid="same-as-owner">
          Es la misma wallet del owner: no se recomienda (el owner no debería estar en el servidor).
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!valid || !account || busy}
        className="rounded bg-green-600 px-4 py-2 font-semibold disabled:opacity-40"
        data-testid="set-verifier"
      >
        {busy ? "Esperando confirmación…" : "Asignar verifier"}
      </button>

      {error && <p className="text-sm text-red-300" data-testid="owner-error">{error}</p>}
      {done && (
        <p className="text-sm text-green-300" data-testid="owner-done">
          Listo. Transacción: {explorerUrl ? <a className="underline" href={`${explorerUrl}/tx/${done}`} target="_blank">{done}</a> : done}
        </p>
      )}
    </main>
  );
}
