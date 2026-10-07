"use client";

import { useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { installmentRegistryAbi } from "@/lib/abi";
import { chain, explorerUrl, publicClient } from "@/lib/monad";
import { connectWallet, errorMessage, sendDeployRegistry } from "@/lib/wallet";

/** Despliega InstallmentRegistry desde el navegador: la wallet que firma queda como `owner`. */
export function DeployTools() {
  const [account, setAccount] = useState<Address>();
  const [verifier, setVerifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [deployed, setDeployed] = useState<{ address: Address; owner: Address; verifier: Address }>();

  const valid = isAddress(verifier.trim(), { strict: false });
  const sameAsOwner = valid && !!account && verifier.trim().toLowerCase() === account.toLowerCase();

  async function onConnect() {
    setError(undefined);
    try {
      setAccount(await connectWallet());
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function onDeploy() {
    if (!account) return;
    setBusy(true);
    setError(undefined);
    setDeployed(undefined);
    try {
      const address = await sendDeployRegistry(account, getAddress(verifier.trim().toLowerCase()));
      const read = (functionName: "owner" | "verifier") => publicClient.readContract({ address, abi: installmentRegistryAbi, functionName });
      const [owner, v] = await Promise.all([read("owner"), read("verifier")]);
      setDeployed({ address, owner, verifier: v });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8 space-y-5" data-testid="deploy-tools">
      <h1 className="text-xl font-bold">Desplegar el contrato (InstallmentRegistry)</h1>
      <p className="text-sm text-white/70">
        Despliega una versión nueva en {chain.name} firmando con tu wallet. <b>La wallet que firma queda como owner</b> (usá la
        wallet personal, no la del servidor). El verifier es la cuenta dedicada que el servidor usa para marcar pagos.
      </p>
      <button type="button" onClick={onConnect} className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20" data-testid="connect">
        {account ? "Cambiar cuenta" : "Conectar wallet"}
      </button>
      {account && <span className="ml-3 text-sm font-mono" data-testid="connected">Owner (quien despliega): {account}</span>}

      <label className="block space-y-1 text-sm">
        <span>Dirección del verifier (wallet dedicada del servidor)</span>
        <input
          className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 font-mono text-sm"
          value={verifier}
          onChange={(e) => setVerifier(e.target.value)}
          placeholder="0x…"
          name="verifier"
        />
      </label>
      {verifier && !valid && <p className="text-sm text-amber-300" data-testid="invalid">Dirección inválida.</p>}
      {sameAsOwner && (
        <p className="text-sm text-amber-300" data-testid="same-as-owner">
          Es la misma wallet que despliega (owner): no se recomienda; el owner no debería estar en el servidor.
        </p>
      )}
      <button
        type="button"
        onClick={onDeploy}
        disabled={!valid || !account || busy}
        className="rounded bg-green-600 px-4 py-2 font-semibold disabled:opacity-40"
        data-testid="deploy"
      >
        {busy ? "Esperando confirmación…" : "Desplegar contrato"}
      </button>
      {error && <p className="text-sm text-red-300" data-testid="deploy-error">{error}</p>}
      {deployed && (
        <div className="rounded border border-green-400/30 bg-green-500/5 p-3 text-sm space-y-1 font-mono break-all" data-testid="deploy-done">
          <div className="font-sans font-semibold text-green-300">Contrato desplegado</div>
          <div>Dirección: <span data-testid="deployed-address">{deployed.address}</span></div>
          <div>Owner: {deployed.owner}</div>
          <div>Verifier: {deployed.verifier}</div>
          {explorerUrl && <a className="underline font-sans" href={`${explorerUrl}/address/${deployed.address}`} target="_blank">Ver en el explorador</a>}
          <div className="font-sans text-white/70 pt-2">
            Ahora configurá <code>NEXT_PUBLIC_REGISTRY_ADDRESS={deployed.address}</code> (en <code>.env.local</code>/Vercel) y reiniciá/reconstruí la web.
          </div>
        </div>
      )}
    </main>
  );
}
