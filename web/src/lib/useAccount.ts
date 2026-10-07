"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { ACCOUNT_EVENT, getConnectedAccount } from "./wallet";

/** Cuenta EVM conectada, compartida entre componentes (autodetección + evento propio + `accountsChanged`). */
export function useAccount(): Address | undefined {
  const [account, setAccount] = useState<Address>();
  useEffect(() => {
    getConnectedAccount().then(setAccount, () => undefined);
    const onAccount = (e: Event) => setAccount((e as CustomEvent<Address>).detail);
    window.addEventListener(ACCOUNT_EVENT, onAccount);
    const onAccountsChanged = (accounts: unknown) => setAccount((accounts as Address[])[0]);
    window.ethereum?.on?.("accountsChanged", onAccountsChanged);
    return () => {
      window.removeEventListener(ACCOUNT_EVENT, onAccount);
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, []);
  return account;
}
