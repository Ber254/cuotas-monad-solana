import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { installmentRegistryAbi } from "@/lib/abi";
import { chain, publicClient, registryAddress } from "@/lib/monad";
import { getObligationCount } from "@/lib/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Chequeo post-deploy. Informa la CONFIGURACIÓN (nunca valores secretos) y si el contrato responde.
 * 200 = listo para operar; 503 = falta algo (el cuerpo dice qué).
 */
export async function GET() {
  const problems: string[] = [];
  if (!registryAddress) problems.push("NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada");
  if (!process.env.VERIFIER_PRIVATE_KEY) problems.push("VERIFIER_PRIVATE_KEY no está configurada (los pagos Solana no se podrán registrar)");

  // La clave configurada debe ser válida Y corresponder al `verifier` del contrato (se expone solo la dirección PÚBLICA).
  let verifierAddress: string | null = null;
  let contractVerifier: string | null = null;
  const pk = process.env.VERIFIER_PRIVATE_KEY;
  if (pk) {
    try {
      verifierAddress = privateKeyToAccount(pk as `0x${string}`).address;
    } catch {
      problems.push("VERIFIER_PRIVATE_KEY no es una clave privada válida (debe ser 0x + 64 hex)");
    }
  }
  if (registryAddress && verifierAddress) {
    try {
      contractVerifier = await publicClient.readContract({ address: registryAddress, abi: installmentRegistryAbi, functionName: "verifier" });
      if (contractVerifier.toLowerCase() !== verifierAddress.toLowerCase())
        problems.push(`la clave configurada (${verifierAddress}) NO es el verifier del contrato (${contractVerifier}): los pagos fallarían`);
    } catch {
      /* el error de lectura se informa abajo */
    }
  }

  const config = {
    chainId: chain.id,
    registryAddress: registryAddress ?? null,
    verifierKeyConfigured: Boolean(process.env.VERIFIER_PRIVATE_KEY),
    verifierAddress,
    contractVerifier,
    solanaRpcUrl: process.env.SOLANA_RPC_URL || "(default: devnet público)",
    solanaUsdcMint: process.env.SOLANA_USDC_MINT || process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || "(default)",
  };
  let obligationCount: string | null = null;
  if (registryAddress) {
    try {
      obligationCount = (await getObligationCount()).toString();
    } catch (e) {
      problems.push(`no se pudo leer el contrato: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  return NextResponse.json({ ok: problems.length === 0, problems, obligationCount, config }, { status: problems.length ? 503 : 200 });
}
