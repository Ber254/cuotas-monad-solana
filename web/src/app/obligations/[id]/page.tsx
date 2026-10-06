import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallmentsTable } from "@/components/InstallmentsTable";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatUsdc } from "@/lib/format";
import { chain, explorerUrl, registryAddress } from "@/lib/monad";
import { findObligationWithInstallments } from "@/lib/registry";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  return /^[0-9]+$/.test(raw) && BigInt(raw) > BigInt(0) ? BigInt(raw) : null;
}

export default async function ObligationPage({ params }: { params: Promise<{ id: string }> }) {
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
        ← Volver
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">
            Obligación #{o.id.toString()} — {o.description}
          </h1>
          <StatusBadge status={o.status} testId="obligation-status" />
        </div>
        <p className="text-sm text-white/60">
          Registrada en <b>Monad</b> ({chain.name}) · contrato{" "}
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
          <div className="font-semibold text-purple-200">Monad — registro verificable</div>
          <p className="text-white/70">
            La obligación, sus cuotas, vencimientos y estados (PENDING / PAID / OVERDUE / COMPLETED) viven en el
            contrato. Cada cambio de estado es una transacción en Monad.
          </p>
        </div>
        <div className="rounded border border-emerald-400/30 bg-emerald-500/5 p-3">
          <div className="font-semibold text-emerald-200">Solana — riel de pago</div>
          <p className="text-white/70">
            Cada cuota se paga en USDC con una transferencia en Solana + memo. El servidor verifica ese pago y
            recién entonces la cuota pasa a PAID en Monad.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <dl className="rounded border border-white/15 p-4 text-sm space-y-2">
          <div>
            <dt className="text-white/60">Deudor (PYME) — paga las cuotas</dt>
            <dd className="font-mono break-all" data-testid="debtor">{o.buyer}</dd>
          </div>
          <div>
            <dt className="text-white/60">Proveedor (acreedor original) — vendió y cobra</dt>
            <dd className="font-mono break-all" data-testid="creditor">{o.seller}</dd>
          </div>
          <div>
            <dt className="text-white/60">Cuenta de cobro original en Solana (USDC)</dt>
            <dd className="font-mono break-all">{o.sellerSolanaAddress}</dd>
          </div>
        </dl>
        <dl className="rounded border border-white/15 p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-white/60">Monto total</dt>
            <dd data-testid="total-amount">{formatUsdc(total)} USDC</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">Cuota</dt>
            <dd data-testid="installment-amount">
              {o.installmentCount} × {formatUsdc(o.installmentAmount)} USDC
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">Pagado</dt>
            <dd>
              <span data-testid="progress">
                {o.paidCount}/{o.installmentCount}
              </span>{" "}
              cuotas · {formatUsdc(paid)} USDC
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">Saldo pendiente</dt>
            <dd data-testid="outstanding">{formatUsdc(total - paid)} USDC</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">Próximo vencimiento</dt>
            <dd>{next ? `${formatDate(next.dueDate)} (cuota ${next.number})` : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">Cuotas vencidas</dt>
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
