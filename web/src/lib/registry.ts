import { BaseError, ContractFunctionRevertedError, type Address } from "viem";
import { installmentRegistryAbi } from "./abi";
import { publicClient, registryAddress } from "./monad";

export const INSTALLMENT_STATUS = ["PENDING", "PAID", "OVERDUE"] as const;
export const OBLIGATION_STATUS = ["ACTIVE", "COMPLETED"] as const;

export type InstallmentStatus = (typeof INSTALLMENT_STATUS)[number];
export type ObligationStatus = (typeof OBLIGATION_STATUS)[number];

export { USDC_DECIMALS } from "./constants";

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

export type Obligation = Awaited<ReturnType<typeof getObligation>>;
export type InstallmentView = Awaited<ReturnType<typeof getInstallments>>[number];

function isObligationNotFound(e: unknown): boolean {
  if (!(e instanceof BaseError)) return false;
  const revert = e.walk((err) => err instanceof ContractFunctionRevertedError);
  return revert instanceof ContractFunctionRevertedError && revert.data?.errorName === "ObligationNotFound";
}

/** Obligación + cuotas, o `null` si el contrato revierte con `ObligationNotFound`. */
export async function findObligationWithInstallments(id: bigint) {
  try {
    const [obligation, installments] = await Promise.all([getObligation(id), getInstallments(id)]);
    return { obligation, installments };
  } catch (e) {
    if (isObligationNotFound(e)) return null;
    throw e;
  }
}
