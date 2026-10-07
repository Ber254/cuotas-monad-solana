import Link from "next/link";
import { getT } from "@/lib/lang.server";
import { rich } from "@/lib/rich";
import type { Translator } from "@/lib/i18n";
import { MyObligations } from "@/components/MyObligations";
import { StatusBadge } from "@/components/StatusBadge";
import { formatUsdc } from "@/lib/format";
import { chain, registryAddress, rpcUrl } from "@/lib/monad";
import { getObligation, getObligationCount, type Obligation } from "@/lib/registry";

export const dynamic = "force-dynamic";

/** Cuántas obligaciones (las más recientes) se listan en la home. */
const LIST_LIMIT = BigInt(50);

type HomeData = { count: string; obligations: Obligation[]; error?: string };

async function readData(t: Translator): Promise<HomeData> {
  if (!registryAddress) return { count: t("home.notConfigured"), obligations: [] };
  try {
    const count = await getObligationCount();
    const ids: bigint[] = [];
    for (let id = count; id > BigInt(0) && id > count - LIST_LIMIT; id--) ids.push(id);
    const obligations = await Promise.all(ids.map((id) => getObligation(id)));
    return { count: count.toString(), obligations };
  } catch (e) {
    const msg = `${t("home.readError")}: ${(e as Error).message.split("\n")[0]}`;
    return { count: msg, obligations: [], error: msg };
  }
}

export default async function Home() {
  const { lang, t } = await getT();
  const { count, obligations } = await readData(t);
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6">
      <h1 className="text-3xl font-bold">Finvia</h1>
      <p>{rich(t("home.intro"))}</p>
      <section className="rounded border border-white/15 p-4 text-sm space-y-1" data-testid="config">
        <div>{t("home.network")}: {chain.name} (chainId {chain.id})</div>
        <div>RPC: {rpcUrl}</div>
        <div>{t("home.contract")}: {registryAddress ?? "—"}</div>
        <div>
          {t("home.count")}: <span data-testid="obligation-count">{count}</span>
        </div>
      </section>

      <MyObligations />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("home.obligations")}</h2>
          <Link href="/obligations/new" className="rounded bg-green-600 px-3 py-1 text-sm font-semibold" data-testid="new-obligation">
            {t("home.new")}
          </Link>
        </div>
        {obligations.length === 0 ? (
          <p className="text-sm text-white/60">{t("home.empty")}</p>
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
                    {t("home.item", { id: o.id.toString(), desc: o.description })}
                  </span>
                  <span className="flex items-center gap-3 text-sm text-white/70">
                    {formatUsdc(o.installmentAmount * BigInt(o.installmentCount), lang)} USDC · {o.paidCount}/
                    {o.installmentCount}
                    <StatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-sm text-white/60">{rich(t("home.footer"))}</p>
    </main>
  );
}
