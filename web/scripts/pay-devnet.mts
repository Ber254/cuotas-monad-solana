// Paga UNA cuota desde la CLI con un keypair de Solana (sin navegador ni Phantom): arma la misma tx que la UI
// (src/lib/solana.ts), la firma, la envía, espera la confirmación y —opcionalmente— llama al verificador.
//   npm run pay:devnet -- --keypair ~/.config/solana/id.json --obligation 1 --number 1 [--confirm https://app.vercel.app]
// Requiere SOL (comisión) y USDC devnet en el keypair. Variables: igual que `real:preflight`.
import fs from "node:fs";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getInstallments } from "../src/lib/registry";
import { DEFAULT_USDC_DEVNET_MINT, buildPaymentTransaction, explorerTxUrl } from "../src/lib/solana";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const [keypairPath, obligationId, numberStr, confirmUrl] = [arg("keypair"), arg("obligation"), arg("number"), arg("confirm")];
if (!keypairPath || !obligationId || !numberStr) { console.error("Uso: --keypair <id.json> --obligation <id> --number <n> [--confirm <urlBase>]"); process.exit(2); }

const solana = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
const mint = new PublicKey(process.env.SOLANA_USDC_MINT || process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || DEFAULT_USDC_DEVNET_MINT);
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8"))));
const number = Number(numberStr);

const installments = await getInstallments(BigInt(obligationId));
const inst = installments.find((i) => i.number === number);
if (!inst) throw new Error("la cuota no existe");
if (inst.status === "PAID") throw new Error("la cuota ya está pagada");
console.log(`Pagador ${payer.publicKey.toBase58()} → acreedor ${inst.creditorSolanaAddress}: ${inst.amount} unidades, cuota ${number} de la obligación #${obligationId}`);

const from = getAssociatedTokenAddressSync(mint, payer.publicKey);
const bal = await solana.getTokenAccountBalance(from).catch(() => null);
if (!bal || BigInt(bal.value.amount) < inst.amount) throw new Error(`saldo USDC insuficiente en ${from.toBase58()} (${bal?.value.amount ?? "sin cuenta"})`);

const { blockhash } = await solana.getLatestBlockhash("confirmed");
const tx = buildPaymentTransaction({ payer: payer.publicKey, seller: new PublicKey(inst.creditorSolanaAddress), mint, amount: inst.amount, obligationId, number }, blockhash);
tx.sign(payer);
const signature = await solana.sendRawTransaction(tx.serialize());
console.log(`Enviada: ${signature}\n${explorerTxUrl(signature)}`);
for (let i = 0; i < 40; i++) {
  const st = (await solana.getSignatureStatuses([signature])).value[0];
  if (st?.err) throw new Error(`la tx falló: ${JSON.stringify(st.err)}`);
  if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") { console.log("Confirmada en Solana."); break; }
  if (i === 39) throw new Error("tiempo agotado esperando la confirmación");
  await new Promise((r) => setTimeout(r, 1500));
}
if (confirmUrl) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${confirmUrl.replace(/\/$/, "")}/api/payments/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ obligationId, number, signature }) });
    const body = await res.json().catch(() => ({}));
    console.log(`confirm intento ${attempt}: HTTP ${res.status} ${JSON.stringify(body)}`);
    if (res.ok) process.exit(0);
    if (!body.retryable) process.exit(1);
    await new Promise((r) => setTimeout(r, 2000));
  }
  process.exit(1);
}
