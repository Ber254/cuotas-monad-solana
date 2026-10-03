import { createPublicClient, defineChain, http, type Address } from "viem";
import { foundry } from "viem/chains";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
});

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? monadTestnet.id);

export const chain = chainId === foundry.id ? foundry : monadTestnet;

export const rpcUrl = process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? chain.rpcUrls.default.http[0];

export const registryAddress = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || undefined) as
  | Address
  | undefined;

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

/** URL base del explorer de Monad (undefined en anvil local). */
export const explorerUrl = chain.blockExplorers?.default.url;
