import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatUsdc } from "@/lib/format";
import { chain, registryAddress, rpcUrl } from "@/lib/monad";
import { getObligation, getObligationCount, type Obligation } from "@/lib/registry";

export const dynamic = "force-dynamic";

/** Cuántas obligaciones (las más recientes) se listan en la home. */
const LIST_LIMIT = BigInt(50);

type HomeData = { count: string; obligations: Obligation[]; error?: string };

async function readData(): Promise<HomeData> {
  if (!registryAddress) return { count: "contrato no configurado", obligations: [] };
  try {
    const count = await getObligationCount();
    const ids: bigint[] = [];
    for (let id = count; id > BigInt(0) && id > count - LIST_LIMIT; id--) ids.push(id);
    const obligations = await Promise.all(ids.map((id) => getObligation(id)));
    return { count: count.toString(), obligations };
  } catch (e) {
    const msg = `error leyendo el contrato: ${(e as Error).message.split("\n")[0]}`;
    return { count: msg, obligations: [], error: msg };
  }
}

export default async function Home() {
  const { count, obligations } = await readData();
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Finvia</h1>
      <p>
        Financiamiento para PYMEs: cada obligación de pago se divide en cuotas registradas en <b>Monad</b>{" "}
        (fuente de verdad verificable), y cada cuota se paga en <b>USDC sobre Solana</b> (riel de pago).
      </p>
      <section className="rounded border border-white/15 p-4 text-sm space-y-1" data-testid="config">
        <div>Red: {chain.name} (chainId {chain.id})</div>
        <div>RPC: {rpcUrl}</div>
        <div>Contrato: {registryAddress ?? "—"}</div>
        <div>
          Obligaciones registradas: <span data-testid="obligation-count">{count}</span>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Obligaciones</h2>
          <Link href="/obligations/new" className="rounded bg-green-600 px-3 py-1 text-sm font-semibold" data-testid="new-obligation">
            + Nueva obligación
          </Link>
        </div>
        {obligations.length === 0 ? (
          <p className="text-sm text-white/60">Todavía no hay obligaciones.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded border border-white/15">
            {obligations.map((o) => (
              <li key={o.id.toString()}>
                <Link
                  href={`/obligations/${o.id}`}
                  className="flex items-center justify-between gap-4 p-3 hover:bg-white/5"
                  data-testid="obligation-link"
                >
                  <span>
                    Obligación #{o.id.toString()} — {o.description}
                  </span>
                  <span className="flex items-center gap-3 text-sm text-white/70">
                    {formatUsdc(o.installmentAmount * BigInt(o.installmentCount))} USDC · {o.paidCount}/
                    {o.installmentCount}
                    <StatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-sm text-white/60">
        MVP de hackathon. Estado y próxima tarea en <code>docs/progress/</code>.
      </p>
    </main>
  );
}
