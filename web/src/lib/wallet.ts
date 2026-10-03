import { createWalletClient, custom, parseEventLogs, toHex, type Address, type EIP1193Provider } from "viem";
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

export async function connectWallet(): Promise<Address> {
  const accounts = (await getProvider().request({ method: "eth_requestAccounts" })) as Address[];
  if (!accounts[0]) throw new Error("La wallet no devolvió ninguna cuenta.");
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

/** Mensaje corto y legible para errores de wallet/viem. */
export function errorMessage(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; code?: number };
  if (err.code === 4001) return "Rechazaste la operación en la wallet.";
  return err.shortMessage ?? err.message?.split("\n")[0] ?? "Error desconocido.";
}
