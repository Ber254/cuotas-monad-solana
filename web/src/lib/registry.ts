import type { Address } from "viem";
import { installmentRegistryAbi } from "./abi";
import { publicClient, registryAddress } from "./monad";

export const INSTALLMENT_STATUS = ["PENDING", "PAID", "OVERDUE"] as const;
export const OBLIGATION_STATUS = ["ACTIVE", "COMPLETED"] as const;

export type InstallmentStatus = (typeof INSTALLMENT_STATUS)[number];
export type ObligationStatus = (typeof OBLIGATION_STATUS)[number];

/** USDC usa 6 decimales tanto en Solana como en el contrato. */
export const USDC_DECIMALS = 6;

function requireAddress(): Address {
  if (!registryAddress) throw new Error("NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada");
  return registryAddress;
}

export async function getObligationCount(): Promise<bigint> {
  return publicClient.readContract({
    address: requireAddress(),
    abi: installmentRegistryAbi,
    functionName: "obligationCount",
  });
}

export async function getObligation(id: bigint) {
  const o = await publicClient.readContract({
    address: requireAddress(),
    abi: installmentRegistryAbi,
    functionName: "getObligation",
    args: [id],
  });
  return { ...o, status: OBLIGATION_STATUS[o.status] };
}

export async function getInstallments(id: bigint) {
  const list = await publicClient.readContract({
    address: requireAddress(),
    abi: installmentRegistryAbi,
    functionName: "getInstallments",
    args: [id],
  });
  return list.map((i) => ({ ...i, status: INSTALLMENT_STATUS[i.status] }));
}
