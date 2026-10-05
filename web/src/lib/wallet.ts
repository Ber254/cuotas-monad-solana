import { BaseError, ContractFunctionRevertedError, createWalletClient, custom, parseEventLogs, toHex, type Address, type EIP1193Provider, type Hex } from "viem";
import { installmentRegistryAbi } from "./abi";
import type { CreateObligationArgs } from "./obligationForm";
import { chain, publicClient, registryAddress, rpcUrl } from "./monad";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export function getProvider(): EIP1193Provider {
  if (!window.ethereum) throw new Error("No se detectó una wallet EVM (instalá MetaMask).");
  return window.ethereum;
}

/** Evento de window para que varios componentes compartan la cuenta conectada. */
export const ACCOUNT_EVENT = "finvia:account";

export async function connectWallet(): Promise<Address> {
  const accounts = (await getProvider().request({ method: "eth_requestAccounts" })) as Address[];
  if (!accounts[0]) throw new Error("La wallet no devolvió ninguna cuenta.");
  window.dispatchEvent(new CustomEvent<Address>(ACCOUNT_EVENT, { detail: accounts[0] }));
  return accounts[0];
}

/** Cuenta ya autorizada para este sitio (sin abrir el popup), si la hay. */
export async function getConnectedAccount(): Promise<Address | undefined> {
  if (!window.ethereum) return undefined;
  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as Address[];
  return accounts[0];
}

/** Cambia la wallet a la red configurada (agregándola si no la conoce). */
export async function ensureChain(): Promise<void> {
  const provider = getProvider();
  const current = Number(await provider.request({ method: "eth_chainId" }));
  if (current === chain.id) return;
  const chainIdHex = toHex(chain.id);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [rpcUrl],
          blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
        },
      ],
    });
  }
}

/** Envía `createObligation`, espera el receipt y devuelve el id leído del evento `ObligationCreated`. */
export async function sendCreateObligation(account: Address, args: CreateObligationArgs): Promise<bigint> {
  if (!registryAddress) throw new Error("NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada");
  await ensureChain();
  const walletClient = createWalletClient({ account, chain, transport: custom(getProvider()) });
  const hash = await walletClient.writeContract({
    address: registryAddress,
    abi: installmentRegistryAbi,
    functionName: "createObligation",
    args,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("La transacción fue revertida.");
  const [created] = parseEventLogs({ abi: installmentRegistryAbi, eventName: "ObligationCreated", logs: receipt.logs });
  if (!created) throw new Error("No se encontró el evento ObligationCreated en el receipt.");
  return created.args.obligationId;
}

const CONTRACT_ERRORS: Record<string, string> = {
  NotAuthorized: "Solo el acreedor (o el verificador) puede marcar una cuota como pagada.",
  AlreadyPaid: "Esa cuota ya está pagada.",
  PaymentRefAlreadyUsed: "Esa referencia de pago ya fue usada en otra cuota; ingresá una distinta.",
  InstallmentNotFound: "La cuota no existe.",
  ObligationNotFound: "La obligación no existe.",
  InvalidParams: "Parámetros inválidos (¿referencia vacía?).",
};

/** Mensaje corto y legible para errores de wallet/viem. */
export function errorMessage(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; code?: number };
  if (err.code === 4001) return "Rechazaste la operación en la wallet.";
  if (e instanceof BaseError) {
    // viem anida el rechazo del usuario (code 4001) dentro de TransactionExecutionError, etc.
    if (e.walk((x) => (x as { code?: number }).code === 4001 || (x as Error).name === "UserRejectedRequestError"))
      return "Rechazaste la operación en la wallet.";
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    const name = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
    if (name && CONTRACT_ERRORS[name]) return CONTRACT_ERRORS[name];
  }
  return err.shortMessage ?? err.message?.split("\n")[0] ?? "Error desconocido.";
}

/** Marca una cuota como pagada (confirmación manual del acreedor, D6). Devuelve el hash de la tx. */
export async function sendMarkInstallmentPaid(
  account: Address,
  obligationId: bigint,
  number: number,
  paymentRef: string,
): Promise<Hex> {
  if (!registryAddress) throw new Error("NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada");
  await ensureChain();
  const walletClient = createWalletClient({ account, chain, transport: custom(getProvider()) });
  const request = { address: registryAddress, abi: installmentRegistryAbi, functionName: "markInstallmentPaid", args: [obligationId, number, paymentRef] } as const;
  // Simula primero para mostrar el motivo del revert (receipt fallido no lo trae).
  await publicClient.simulateContract({ ...request, account });
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("La transacción fue revertida.");
  return hash;
}
