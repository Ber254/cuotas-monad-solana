// Validación contra redes REALES (Solana devnet + Monad Testnet). Dos subcomandos:
//   npm run real:preflight
//       Conectividad, mint USDC, contrato (owner/verifier), saldo del verifier y si VERIFIER_PRIVATE_KEY
//       corresponde al verifier del contrato.
//   npm run real:tx -- <firmaSolana> <obligationId> <cuota>
//       Trae la tx real de Solana, la contrasta con la obligación de Monad usando el MISMO verificador del
//       servidor y vuelca lo que ve, para detectar diferencias de formato con las fixtures.
// Variables (las mismas que la web): NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_MONAD_RPC_URL,
// NEXT_PUBLIC_REGISTRY_ADDRESS, SOLANA_RPC_URL, SOLANA_USDC_MINT, VERIFIER_PRIVATE_KEY (opcional).
import { Connection, PublicKey } from "@solana/web3.js";
import { formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { installmentRegistryAbi } from "../src/lib/abi";
import { chain, publicClient, registryAddress, rpcUrl } from "../src/lib/monad";
import { getInstallments } from "../src/lib/registry";
import { DEFAULT_USDC_DEVNET_MINT } from "../src/lib/solana";
import { verifyPaymentTx } from "../src/lib/verifyPayment";

const solanaUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const mint = process.env.SOLANA_USDC_MINT || process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || DEFAULT_USDC_DEVNET_MINT;
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const solana = new Connection(solanaUrl, "confirmed");

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const warn = (m: string) => console.log(`  ⚠ ${m}`);
const bad = (m: string) => { failures++; console.log(`  ✗ ${m}`); };
const check = (cond: boolean, okMsg: string, badMsg: string) => (cond ? ok(okMsg) : bad(badMsg));
const msg = (e: unknown) => (e as Error).message.split("\n")[0];

async function preflight() {
  console.log(`Solana: ${solanaUrl}\nMonad:  ${rpcUrl} (chainId esperado ${chain.id})\nMint:   ${mint}\nContrato: ${registryAddress ?? "(sin configurar)"}\n`);

  console.log("[Solana]");
  try { const v = await solana.getVersion(); ok(`RPC responde (solana-core ${v["solana-core"]})`); } catch (e) { bad(`RPC de Solana no responde: ${msg(e)}`); }
  try {
    const info = await solana.getParsedAccountInfo(new PublicKey(mint));
    const data = info.value?.data;
    if (!info.value) bad("el mint NO existe en esta red (¿mint de otra red o mal copiado?)");
    else if (!data || Buffer.isBuffer(data) || data.parsed?.type !== "mint") bad("la cuenta del mint no es un mint SPL");
    else {
      check(info.value.owner.toBase58() === TOKEN_PROGRAM, "el mint pertenece al programa SPL Token", `owner inesperado: ${info.value.owner.toBase58()}`);
      check(data.parsed.info.decimals === 6, "decimales = 6 (coincide con el contrato)", `decimales = ${data.parsed.info.decimals}, se esperaba 6`);
      console.log(`    supply=${data.parsed.info.supply} mintAuthority=${data.parsed.info.mintAuthority}  → confirmá a mano que es el USDC de devnet de Circle`);
    }
  } catch (e) { bad(`no se pudo leer el mint: ${msg(e)}`); }

  console.log("\n[Monad]");
  try {
    const id = await publicClient.getChainId();
    check(id === chain.id, `chainId ${id}`, `el RPC devuelve chainId ${id}, la web espera ${chain.id}`);
  } catch (e) { bad(`RPC de Monad no responde: ${msg(e)}`); }
  if (!registryAddress) { bad("NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada"); return; }
  try {
    const [owner, verifier, count] = await Promise.all(
      (["owner", "verifier", "obligationCount"] as const).map((functionName) => publicClient.readContract({ address: registryAddress!, abi: installmentRegistryAbi, functionName })),
    );
    ok(`contrato legible: owner=${owner} verifier=${verifier} obligaciones=${count}`);
    const bal = await publicClient.getBalance({ address: verifier as `0x${string}` });
    check(bal > BigInt(0), `el verifier tiene ${formatEther(bal)} (gas)`, "el verifier NO tiene saldo para gas: fondearlo con el faucet");
    const pk = process.env.VERIFIER_PRIVATE_KEY;
    if (!pk) warn("VERIFIER_PRIVATE_KEY no definida: no se puede comprobar que coincida con el verifier");
    else {
      const addr = privateKeyToAccount(pk as `0x${string}`).address;
      check(addr.toLowerCase() === (verifier as string).toLowerCase(), `VERIFIER_PRIVATE_KEY corresponde al verifier del contrato (${addr})`,
        `VERIFIER_PRIVATE_KEY es ${addr} pero el verifier del contrato es ${verifier} → los pagos darían NotAuthorized (usar setVerifier)`);
      if (addr.toLowerCase() === (owner as string).toLowerCase()) warn("la clave del servidor es la del OWNER del contrato: usar una wallet verifier dedicada (DEPLOY.md § 0)");
    }
  } catch (e) { bad(`no se pudo leer el contrato: ${msg(e)}`); }
}

async function checkTx(signature: string, obligationId: string, number: number) {
  console.log(`Tx ${signature}\nObligación #${obligationId}, cuota ${number}\n`);
  const installments = await getInstallments(BigInt(obligationId));
  const inst = installments.find((i) => i.number === number);
  if (!inst) { bad("la cuota no existe"); return; }
  console.log(`Esperado: ${inst.amount} unidades de ${mint} → ATA de ${inst.creditorSolanaAddress} (acreedor actual: ${inst.creditor}), memo "cuotas:${obligationId}:${number}" (estado cuota: ${inst.status})\n`);
  const tx = await solana.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx) { bad("Solana no devuelve la tx (¿firma de otra red, o aún no confirmada?)"); return; }
  console.log("Lo que devolvió Solana (instrucciones de nivel superior):");
  for (const ix of tx.transaction.message.instructions) {
    if ("parsed" in ix) console.log(`    ${ix.program}: ${JSON.stringify(ix.parsed).slice(0, 260)}`);
    else console.log(`    (sin parsear) ${ix.programId.toBase58()}`);
  }
  const r = verifyPaymentTx(tx, { mint, sellerSolanaAddress: inst.creditorSolanaAddress, amount: inst.amount, obligationId, number });
  console.log();
  if (r.ok) ok(`el verificador del servidor ACEPTARÍA este pago (pagador ${r.payer})`);
  else bad(`el verificador RECHAZARÍA este pago: ${r.reason}  → comparar con lo de arriba y ajustar src/lib/verifyPayment.ts + scripts/fixtures-solana.mts`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "preflight") await preflight();
else if (cmd === "tx" && args.length === 3) await checkTx(args[0], args[1], Number(args[2]));
else { console.error("Uso: preflight | tx <firma> <obligationId> <cuota>"); process.exit(2); }
console.log(failures ? `\n✗ ${failures} problema(s)` : "\n✓ todo en orden");
process.exit(failures ? 1 : 0);
