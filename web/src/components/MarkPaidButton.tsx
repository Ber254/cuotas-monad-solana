"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useT } from "@/components/LangProvider";
import { ACCOUNT_EVENT, connectWallet, errorMessage, getConnectedAccount, sendMarkInstallmentPaid } from "@/lib/wallet";

/**
 * Confirmación manual del acreedor (D6). Solo se ofrece la acción si la wallet conectada es el
 * acreedor ACTUAL de ese pagaré (puede haber sido cedido); el contrato igual lo hace cumplir (`NotAuthorized`).
 */
export function MarkPaidButton({
  obligationId,
  number,
  creditor,
}: {
  obligationId: string;
  number: number;
  creditor: Address;
}) {
  const router = useRouter();
  const { t } = useT();
  const [account, setAccount] = useState<Address>();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // Todas las filas comparten la cuenta: se autodetecta y se actualiza si otra fila conecta.
  useEffect(() => {
    getConnectedAccount().then(setAccount, () => undefined);
    const onAccount = (e: Event) => setAccount((e as CustomEvent<Address>).detail);
    window.addEventListener(ACCOUNT_EVENT, onAccount);
    // Cambio de cuenta desde la wallet (MetaMask emite `accountsChanged`).
    const onAccountsChanged = (accounts: unknown) => setAccount((accounts as Address[])[0]);
    window.ethereum?.on?.("accountsChanged", onAccountsChanged);
    return () => {
      window.removeEventListener(ACCOUNT_EVENT, onAccount);
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, []);

  async function onConnect() {
    setError(undefined);
    try {
      setAccount(await connectWallet());
    } catch (e) {
      setError(errorMessage(e, t));
    }
  }

  async function onConfirm() {
    if (!account) return;
    setBusy(true);
    setError(undefined);
    try {
      await sendMarkInstallmentPaid(account, BigInt(obligationId), number, ref.trim());
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <div>
        <button type="button" onClick={onConnect} className="text-xs underline text-white/60" data-testid="mark-paid-connect">
          {t("common.connectWallet")}
        </button>
        {error && <div className="text-xs text-red-300">{error}</div>}
      </div>
    );
  }
  if (account.toLowerCase() !== creditor.toLowerCase()) {
    return <span className="text-xs text-white/40">{t("mp.onlyCreditor")}</span>;
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setRef(`manual-${obligationId}-${number}-${Date.now()}`);
          setOpen(true);
        }}
        className="rounded bg-green-600 px-2 py-1 text-xs font-semibold"
        data-testid="mark-paid"
      >
        {t("mp.button")}
      </button>
    );
  }
  return (
    <div className="space-y-1">
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        className="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-xs"
        data-testid="mark-paid-ref"
        aria-label={t("mp.refLabel")}
      />
      <div className="text-[10px] text-white/50">{t("mp.manual")}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !ref.trim()}
          className="rounded bg-green-600 px-2 py-1 text-xs font-semibold disabled:opacity-40"
          data-testid="mark-paid-confirm"
        >
          {busy ? t("mp.confirming") : t("mp.confirm")}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="text-xs underline">
          {t("mp.cancel")}
        </button>
      </div>
      {error && (
        <div className="text-xs text-red-300" data-testid="mark-paid-error">
          {error}
        </div>
      )}
    </div>
  );
}
