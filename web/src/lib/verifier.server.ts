import { Connection } from "@solana/web3.js";
import { BaseError, ContractFunctionRevertedError, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { installmentRegistryAbi } from "./abi";
import type { ConfirmDeps } from "./confirmPayment";
import { chain, publicClient, registryAddress, rpcUrl } from "./monad";
import { DEFAULT_USDC_DEVNET_MINT } from "./solana";
import { findObligationWithInstallments } from "./registry";

/** SOLO servidor: usa VERIFIER_PRIVATE_KEY (nunca NEXT_PUBLIC_). */
export function createConfirmDeps(): ConfirmDeps {
  const pk = process.env.VERIFIER_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("VERIFIER_PRIVATE_KEY no está configurada en el servidor.");
  if (!registryAddress) throw new Error("NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada.");
  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const solana = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
  const address = registryAddress;

  return {
    usdcMint: process.env.SOLANA_USDC_MINT || process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || DEFAULT_USDC_DEVNET_MINT,
    async readObligation(id) {
      const data = await findObligationWithInstallments(id);
      if (!data) return null;
      return {
        sellerSolanaAddress: data.obligation.sellerSolanaAddress,
        installments: data.installments.map((i) => ({ number: i.number, amount: i.amount, status: i.status })),
      };
    },
    fetchSolanaTx: (signature) =>
      solana.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
    async markPaid(id, number, signature) {
      const request = { address, abi: installmentRegistryAbi, functionName: "markInstallmentPaid", args: [id, number, signature] } as const;
      try {
        await publicClient.simulateContract({ ...request, account });
      } catch (e) {
        // Propaga el nombre del error custom del contrato para mapear a 409.
        const revert = e instanceof BaseError ? e.walk((x) => x instanceof ContractFunctionRevertedError) : null;
        const name = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
        throw Object.assign(new Error((e as Error).message), { name: name ?? "Error" });
      }
      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("La transacción en Monad fue revertida.");
      return hash;
    },
  };
}
