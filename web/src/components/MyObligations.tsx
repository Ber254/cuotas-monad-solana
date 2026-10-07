"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";
import { getMyObligations, type MyRole } from "@/lib/registry";
import { useAccount } from "@/lib/useAccount";
import { connectWallet, errorMessage } from "@/lib/wallet";


/** "Mis pagarés": obligaciones donde la wallet conectada es proveedor, deudor o recibió pagarés por cesión. */
export function MyObligations() {
  const { t } = useT();
  const account = useAccount();
  const [items, setItems] = useState<{ id: bigint; roles: MyRole[] }[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!account) return;
    let alive = true;
    getMyObligations(account).then((r) => alive && setItems(r), (e) => alive && setError(errorMessage(e, t)));
    return () => {
      alive = false;
    };
  }, [account]);

  return (
    <section className="space-y-2" data-testid="my-obligations">
      <h2 className="text-lg font-semibold">{t("my.title")}</h2>
      {!account ? (
        <button
          type="button"
          onClick={() => connectWallet().catch((e) => setError(errorMessage(e, t)))}
          className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          data-testid="my-connect"
        >
          {t("common.connectWallet")}
        </button>
      ) : items === undefined ? (
        <p className="text-sm text-white/60">{t("my.reading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-white/60" data-testid="my-empty">{t("my.empty")}</p>
      ) : (
        <ul className="divide-y divide-white/10 rounded border border-white/15">
          {items.map(({ id, roles }) => (
            <li key={id.toString()}>
              <Link href={`/obligations/${id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-white/5" data-testid="my-obligation-link">
                <span>{t("my.item", { id: id.toString() })}</span>
                <span className="flex gap-2 text-xs">
                  {roles.map((r) => (
                    <span key={r} className="rounded bg-white/10 px-2 py-0.5" data-testid="my-role">
                      {t(`my.role.${r}` as const)}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </section>
  );
}
