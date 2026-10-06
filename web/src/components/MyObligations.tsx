"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyObligations, type MyRole } from "@/lib/registry";
import { useAccount } from "@/lib/useAccount";
import { connectWallet, errorMessage } from "@/lib/wallet";

const ROLE_LABEL: Record<MyRole, string> = {
  proveedor: "Proveedor (creaste)",
  deudor: "Deudor (pagás vos)",
  "acreedor-cedido": "Acreedor por cesión",
};

/** "Mis pagarés": obligaciones donde la wallet conectada es proveedor, deudor o recibió pagarés por cesión. */
export function MyObligations() {
  const account = useAccount();
  const [items, setItems] = useState<{ id: bigint; roles: MyRole[] }[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!account) return;
    let alive = true;
    getMyObligations(account).then((r) => alive && setItems(r), (e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [account]);

  return (
    <section className="space-y-2" data-testid="my-obligations">
      <h2 className="text-lg font-semibold">Mis pagarés</h2>
      {!account ? (
        <button
          type="button"
          onClick={() => connectWallet().catch((e) => setError(errorMessage(e)))}
          className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          data-testid="my-connect"
        >
          Conectar wallet
        </button>
      ) : items === undefined ? (
        <p className="text-sm text-white/60">Leyendo desde Monad…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-white/60" data-testid="my-empty">Esta wallet no participa en ninguna obligación.</p>
      ) : (
        <ul className="divide-y divide-white/10 rounded border border-white/15">
          {items.map(({ id, roles }) => (
            <li key={id.toString()}>
              <Link href={`/obligations/${id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-white/5" data-testid="my-obligation-link">
                <span>Obligación #{id.toString()}</span>
                <span className="flex gap-2 text-xs">
                  {roles.map((r) => (
                    <span key={r} className="rounded bg-white/10 px-2 py-0.5" data-testid="my-role">
                      {ROLE_LABEL[r]}
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
