import { chain, registryAddress, rpcUrl } from "@/lib/monad";
import { getObligationCount } from "@/lib/registry";

export const dynamic = "force-dynamic";

async function readCount(): Promise<string> {
  if (!registryAddress) return "contrato no configurado";
  try {
    return (await getObligationCount()).toString();
  } catch (e) {
    return `error leyendo el contrato: ${(e as Error).message.split("\n")[0]}`;
  }
}

export default async function Home() {
  const count = await readCount();
  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Cuotas</h1>
      <p>
        Obligaciones de pago en cuotas registradas en <b>Monad</b>, con pago de cada cuota en{" "}
        <b>USDC sobre Solana</b>.
      </p>
      <section className="rounded border border-white/15 p-4 text-sm space-y-1" data-testid="config">
        <div>Red: {chain.name} (chainId {chain.id})</div>
        <div>RPC: {rpcUrl}</div>
        <div>Contrato: {registryAddress ?? "—"}</div>
        <div>
          Obligaciones registradas: <span data-testid="obligation-count">{count}</span>
        </div>
      </section>
      <p className="text-sm text-white/60">
        Base del MVP. Estado y próxima tarea en <code>docs/progress/</code>.
      </p>
    </main>
  );
}
