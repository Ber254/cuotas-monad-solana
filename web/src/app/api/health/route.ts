import { NextResponse } from "next/server";
import { chain, registryAddress } from "@/lib/monad";
import { getObligationCount } from "@/lib/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Chequeo post-deploy. Informa la CONFIGURACIÓN (nunca valores secretos) y si el contrato responde.
 * 200 = listo para operar; 503 = falta algo (el cuerpo dice qué).
 */
export async function GET() {
  const config = {
    chainId: chain.id,
    registryAddress: registryAddress ?? null,
    verifierKeyConfigured: Boolean(process.env.VERIFIER_PRIVATE_KEY),
    solanaRpcUrl: process.env.SOLANA_RPC_URL || "(default: devnet público)",
    solanaUsdcMint: process.env.SOLANA_USDC_MINT || process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || "(default)",
  };
  const problems: string[] = [];
  if (!registryAddress) problems.push("NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada");
  if (!config.verifierKeyConfigured) problems.push("VERIFIER_PRIVATE_KEY no está configurada (los pagos Solana no se podrán registrar)");

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
