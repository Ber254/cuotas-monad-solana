import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallmentsTable } from "@/components/InstallmentsTable";
import { StatusBadge } from "@/components/StatusBadge";
import { getT } from "@/lib/lang.server";
import { rich } from "@/lib/rich";
import { formatDate, formatUsdc } from "@/lib/format";
import { chain, explorerUrl, registryAddress } from "@/lib/monad";
import { findObligationWithInstallments } from "@/lib/registry";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  return /^[0-9]+$/.test(raw) && BigInt(raw) > BigInt(0) ? BigInt(raw) : null;
}

export default async function ObligationPage({ params }: { params: Promise<{ id: string }> }) {
  const { lang, t } = await getT();
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null || !registryAddress) notFound();

  const data = await findObligationWithInstallments(id);
  if (!data) notFound();
  const { obligation: o, installments } = data;

  const total = o.installmentAmount * BigInt(o.installmentCount);
  const paid = o.installmentAmount * BigInt(o.paidCount);
  const overdue = installments.filter((i) => i.status === "OVERDUE").length;
  const next = installments.find((i) => i.status !== "PAID");

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8 space-y-6">
      <Link href="/" className="text-sm text-white/60 hover:underline">
        {t("nav.back")}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">
            {t("detail.title", { id: o.id.toString(), desc: o.description })}
          </h1>
          <StatusBadge status={o.status} testId="obligation-status" />
        </div>
        <p className="text-sm text-white/60">
          {rich(t("detail.registered", { chain: chain.name }))}{" "}
          {explorerUrl ? (
            <a className="underline" href={`${explorerUrl}/address/${registryAddress}`} target="_blank">
              {registryAddress}
            </a>
          ) : (
            <code>{registryAddress}</code>
          )}
        </p>
      </header>

      <section className="grid gap-3 text-sm sm:grid-cols-2" data-testid="chains-panel">
        <div className="rounded border border-purple-400/30 bg-purple-500/5 p-3">
          <div className="font-semibold text-purple-200">{t("chains.monad.title")}</div>
          <p className="text-white/70">
            {t("chains.monad.body")}
          </p>
        </div>
        <div className="rounded border border-emerald-400/30 bg-emerald-500/5 p-3">
          <div className="font-semibold text-emerald-200">{t("chains.solana.title")}</div>
          <p className="text-white/70">
            {t("chains.solana.body")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <dl className="rounded border border-white/15 p-4 text-sm space-y-2">
          <div>
            <dt className="text-white/60">{t("party.debtor")}</dt>
            <dd className="font-mono break-all" data-testid="debtor">{o.buyer}</dd>
          </div>
          <div>
            <dt className="text-white/60">{t("party.supplier")}</dt>
            <dd className="font-mono break-all" data-testid="creditor">{o.seller}</dd>
          </div>
          <div>
            <dt className="text-white/60">{t("party.solana")}</dt>
            <dd className="font-mono break-all">{o.sellerSolanaAddress}</dd>
          </div>
        </dl>
        <dl className="rounded border border-white/15 p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-white/60">{t("sum.total")}</dt>
            <dd data-testid="total-amount">{formatUsdc(total, lang)} USDC</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">{t("sum.installment")}</dt>
            <dd data-testid="installment-amount">
              {o.installmentCount} × {formatUsdc(o.installmentAmount, lang)} USDC
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">{t("sum.paid")}</dt>
            <dd>
              <span data-testid="progress">
                {o.paidCount}/{o.installmentCount}
              </span>{" "}
              {t("sum.installmentsWord")} · {formatUsdc(paid, lang)} USDC
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">{t("sum.outstanding")}</dt>
            <dd data-testid="outstanding">{formatUsdc(total - paid, lang)} USDC</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">{t("sum.next")}</dt>
            <dd>{next ? t("sum.nextValue", { date: formatDate(next.dueDate, lang), n: next.number }) : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">{t("sum.overdue")}</dt>
            <dd className={overdue ? "text-red-300" : undefined} data-testid="overdue-count">{overdue}</dd>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-white/10">
            <div
              className="h-full bg-green-500"
              style={{ width: `${(o.paidCount / o.installmentCount) * 100}%` }}
            />
          </div>
        </dl>
      </section>

      <InstallmentsTable
        obligationId={o.id.toString()}
        buyer={o.buyer}
        seller={o.seller}
        rows={installments.map((i) => ({
          number: i.number,
          amount: i.amount.toString(),
          dueDate: i.dueDate.toString(),
          status: i.status,
          paidAt: i.paidAt.toString(),
          paymentRef: i.paymentRef,
          creditor: i.creditor,
          creditorSolanaAddress: i.creditorSolanaAddress,
        }))}
      />
    </main>
  );
}
