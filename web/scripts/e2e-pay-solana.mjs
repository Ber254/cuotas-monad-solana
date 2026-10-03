// E2E etapa 8: Phantom y RPC de Solana simulados (devnet no es alcanzable en algunos entornos).
// Uso: node scripts/e2e-pay-solana.mjs <id> ; <id> = obligación de 2 cuotas con sellerSolanaAddress válida (on-curve).
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";
const ID = process.argv[2], SOLPK = process.argv[3];
const IIFE = fs.readFileSync("/home/user/cuotas-monad-solana/web/node_modules/@solana/web3.js/lib/index.iife.min.js", "utf8");
const exe = fs.readdirSync("/opt/pw-browsers").filter(d => d.startsWith("chromium-"))[0];
const browser = await chromium.launch({ executablePath: `/opt/pw-browsers/${exe}/chrome-linux/chrome`, args: ["--no-sandbox"] });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", e => console.log("PAGEERROR", e.message));
page.on("console", m => { if (m.type()==="error") console.log("CONSOLE", m.text().slice(0,200)); });
let rpcMethods = []; let balance = "1000000000";
await page.route("https://api.devnet.solana.com/**", async (route) => {
  const req = route.request().postDataJSON(); rpcMethods.push(req.method);
  const result = {
    getTokenAccountBalance: { context: { slot: 1 }, value: { amount: balance, decimals: 6, uiAmount: 1, uiAmountString: "1" } },
    getLatestBlockhash: { context: { slot: 1 }, value: { blockhash: "EETubP5AKHgjPAhzPAFcb8BxqgxfBpbNMo5yqRDFTCEZ", lastValidBlockHeight: 100 } },
    getSignatureStatuses: { context: { slot: 1 }, value: [{ slot: 1, confirmations: 1, err: null, confirmationStatus: "confirmed" }] },
  }[req.method];
  await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ jsonrpc: "2.0", id: req.id, result }) });
});
await page.addInitScript(IIFE + "\n;window.solanaWeb3 = solanaWeb3;");
await page.addInitScript(() => {
  const pk = new solanaWeb3.PublicKey("Fz4ud9UzxsPAVU4sB3TqJkNKaDvjTi4xcaXBA2Zqk8rQ".length === 44 ? solanaWeb3.Keypair.generate().publicKey.toBase58() : "");
  window.solana = {
    isPhantom: true,
    connect: async () => ({ publicKey: pk }),
    signAndSendTransaction: async (tx) => {
      window.__tx = { feePayer: tx.feePayer.toBase58(), ixs: tx.instructions.map(i => ({ program: i.programId.toBase58(), data: Array.from(i.data) })) };
      return { signature: "5".repeat(88) };
    },
  };
});
await page.goto(`http://localhost:3100/obligations/${ID}`);
await page.waitForSelector('[data-testid="pay-solana"]');
assert.equal(await page.locator('[data-testid="pay-solana"]').count(), 2);
await page.locator('[data-testid="pay-solana"]').first().click();
await page.waitForSelector('[data-testid="sol-sent"], [data-testid="pay-solana-error"]', { timeout: 15000 }); if (await page.locator('[data-testid="pay-solana-error"]').count()) throw new Error("UI error: " + await page.locator('[data-testid="pay-solana-error"]').first().innerText());
const tx = await page.evaluate(() => window.__tx);
assert.equal(tx.ixs.length, 3);
assert.equal(tx.ixs[2].program, "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
assert.equal(Buffer.from(tx.ixs[2].data).toString(), `cuotas:${ID}:1`);
const amt = Buffer.from(tx.ixs[1].data).readBigUInt64LE(1);
assert.equal(amt, BigInt(500_000_000));
console.log("tx enviada a Phantom: 3 ix, memo", Buffer.from(tx.ixs[2].data).toString(), "monto", amt.toString());
const href = await page.getAttribute('[data-testid="sol-signature"]', "href");
assert.ok(href.includes("cluster=devnet")); console.log("link:", href.slice(0, 60) + "…");
// la cuota sigue PENDING (no se marca PAID sin verificación)
assert.equal(await page.locator('[data-testid="installment-status"]:has-text("PENDING")').count(), 2);
// saldo insuficiente → error legible
balance = "1"; await page.reload(); await page.waitForSelector('[data-testid="pay-solana"]');
await page.locator('[data-testid="pay-solana"]').first().click();
await page.waitForSelector('[data-testid="pay-solana-error"]');
console.log("sin saldo →", await page.locator('[data-testid="pay-solana-error"]').first().innerText());
await browser.close(); console.log("methods RPC:", [...new Set(rpcMethods)].join(","), "\nE2E etapa 8: OK");
