import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkPaidButton } from "@/components/MarkPaidButton";
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
    <main className="mx-auto max-w-4xl p-8 space-y-6">
      <Link href="/" className="text-sm text-white/60 hover:underline">
        ← Volver
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
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

      <section className="grid gap-4 sm:grid-cols-2">
        <dl className="rounded border border-white/15 p-4 text-sm space-y-2">
          <div>
            <dt className="text-white/60">Deudor (PYME) — paga las cuotas</dt>
            <dd className="font-mono break-all" data-testid="debtor">{o.buyer}</dd>
          </div>
          <div>
            <dt className="text-white/60">Acreedor / inversor — cobra las cuotas</dt>
            <dd className="font-mono break-all" data-testid="creditor">{o.seller}</dd>
          </div>
          <div>
            <dt className="text-white/60">Cuenta de cobro en Solana (USDC)</dt>
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
            <dd className={overdue ? "text-red-300" : undefined}>{overdue}</dd>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-white/10">
            <div
              className="h-full bg-green-500"
              style={{ width: `${(o.paidCount / o.installmentCount) * 100}%` }}
            />
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Cuotas</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-white/60">
            <tr className="border-b border-white/15">
              <th className="py-2">N°</th>
              <th>Monto (USDC)</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Pagada el</th>
              <th>Ref. de pago (Solana)</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((i) => (
              <tr key={i.number} className="border-b border-white/5" data-testid="installment-row">
                <td className="py-2">{i.number}</td>
                <td>{formatUsdc(i.amount)}</td>
                <td>{formatDate(i.dueDate)}</td>
                <td>
                  <StatusBadge status={i.status} testId="installment-status" />
                </td>
                <td>{i.paidAt > BigInt(0) ? formatDate(i.paidAt) : "—"}</td>
                <td className="font-mono break-all" data-testid="payment-ref">
                  {i.paymentRef || "—"}
                </td>
                <td>
                  {i.status !== "PAID" && (
                    <MarkPaidButton obligationId={o.id.toString()} number={i.number} seller={o.seller} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-white/50">
          OVERDUE se calcula al leer (impaga y vencida); no se guarda on-chain. El pago con USDC en Solana
          todavía no está implementado (etapas 8–9); por ahora el acreedor confirma el cobro a mano.
        </p>
      </section>
    </main>
  );
}
