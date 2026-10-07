// Utilidades E2E: billeteras simuladas (EVM y Phantom), cadena local (cast) y navegador.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
export const ANVIL = "http://127.0.0.1:8545";
export const ACCOUNTS = {
  seller: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // anvil 0: acreedor y verifier
  pyme: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // anvil 1: PYME deudora
  carol: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // anvil 3: nuevo acreedor (cesión)
};
const SELLER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const root = path.resolve(import.meta.dirname, "..");
const IIFE = fs.readFileSync(path.join(root, "node_modules/@solana/web3.js/lib/index.iife.min.js"), "utf8") + "\n;window.solanaWeb3 = solanaWeb3;";

export const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => l.split("=")),
);
export const REGISTRY = env.NEXT_PUBLIC_REGISTRY_ADDRESS;

const cast = (...a) => execFileSync("cast", a, { encoding: "utf8" }).trim();

/** Crea una obligación en anvil desde la cuenta acreedor; devuelve su id. */
export function createObligation({ description, solana, unit = 500_000_000, count = 2, firstDueInDays = 40, intervalDays = 30 }) {
  const first = Math.floor(Date.now() / 1000) + firstDueInDays * 86400;
  cast("send", REGISTRY, "createObligation(string,address,string,uint256,uint8,uint64,uint64)", description, ACCOUNTS.pyme,
    solana, String(unit), String(count), String(first), String(intervalDays * 86400), "--private-key", SELLER_PK, "--rpc-url", ANVIL);
  return cast("call", REGISTRY, "obligationCount()(uint256)", "--rpc-url", ANVIL).split(" ")[0];
}
export const advanceDays = (d) => { cast("rpc", "evm_increaseTime", String(d * 86400), "--rpc-url", ANVIL); cast("rpc", "evm_mine", "--rpc-url", ANVIL); };
export const randomSolanaPubkey = () => execFileSync("node", ["-e", 'console.log(require("@solana/web3.js").Keypair.generate().publicKey.toBase58())'], { cwd: root, encoding: "utf8" }).trim();

let browser;
export async function launch() {
  const candidates = [];
  try { candidates.push(chromium.executablePath()); } catch {}
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (fs.existsSync(base)) for (const d of fs.readdirSync(base).filter((d) => d.startsWith("chromium-"))) candidates.push(`${base}/${d}/chrome-linux/chrome`);
  const executablePath = candidates.find((c) => c && fs.existsSync(c));
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  return browser;
}
export const closeBrowser = () => browser?.close();

/**
 * Página con wallets simuladas.
 * evm: false | { account, startConnected, wrongChain, unknownChain, rejectConnect, rejectSend }
 * phantom: false | { rejectConnect, rejectSend, amountDelta, memoOverride, destinationOverride }
 * solBalance: saldo USDC (unidades mínimas) que devuelve el RPC de Solana del cliente.
 */
export async function newPage({ evm = false, phantom = false, solBalance = "5000000000", viewport } = {}) {
  const page = await (await browser.newContext({ viewport })).newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.exposeFunction("__rpc", async (method, params) => {
    const r = await fetch(ANVIL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    const j = await r.json();
    if (j.error) throw Object.assign(new Error(j.error.message), { code: j.error.code });
    return j.result;
  });
  // RPC de Solana que usa el CLIENTE (balance, blockhash, estado); el servidor usa el mock en :8899.
  await page.route("https://api.devnet.solana.com/**", async (route) => {
    const req = route.request().postDataJSON?.() ?? {};
    const result = {
      getTokenAccountBalance: { context: { slot: 1 }, value: { amount: solBalance, decimals: 6, uiAmount: 1, uiAmountString: "1" } },
      getLatestBlockhash: { context: { slot: 1 }, value: { blockhash: "EETubP5AKHgjPAhzPAFcb8BxqgxfBpbNMo5yqRDFTCEZ", lastValidBlockHeight: 100 } },
      getSignatureStatuses: { context: { slot: 1 }, value: [{ slot: 1, confirmations: 1, err: null, confirmationStatus: "confirmed" }] },
    }[req.method];
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ jsonrpc: "2.0", id: req.id, result }) });
  });
  await page.addInitScript(IIFE);
  if (evm) {
    await page.addInitScript((o) => {
      let connected = !!o.startConnected, chainOk = !o.wrongChain, added = false;
      const listeners = {};
      window.__evmCalls = [];
      window.ethereum = {
        on(ev, fn) { (listeners[ev] ||= []).push(fn); },
        removeListener(ev, fn) { listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn); },
        __emit(ev, arg) { (listeners[ev] || []).forEach((f) => f(arg)); },
        request: async ({ method, params }) => {
          window.__evmCalls.push(method);
          if (method === "eth_requestAccounts") {
            if (o.rejectConnect) throw Object.assign(new Error("User rejected"), { code: 4001 });
            connected = true; return [o.account];
          }
          if (method === "eth_accounts") return connected ? [o.account] : [];
          if (method === "eth_chainId") return chainOk ? "0x7a69" : "0x1";
          if (method === "wallet_switchEthereumChain") {
            if (o.unknownChain && !added) throw Object.assign(new Error("Unrecognized chain"), { code: 4902 });
            chainOk = true; return null;
          }
          if (method === "wallet_addEthereumChain") { added = true; chainOk = true; return null; }
          if (method === "eth_sendTransaction" && o.rejectSend) throw Object.assign(new Error("User rejected"), { code: 4001 });
          return window.__rpc(method, params ?? []);
        },
      };
    }, { account: ACCOUNTS.seller, ...evm });
  }
  if (phantom) {
    await page.addInitScript((o) => {
      const pk = solanaWeb3.Keypair.generate().publicKey;
      const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      window.__phantomSends = 0;
      window.solana = {
        isPhantom: true,
        connect: async () => { if (o.rejectConnect) throw Object.assign(new Error("User rejected"), { code: 4001 }); return { publicKey: pk }; },
        signAndSendTransaction: async (tx) => {
          if (o.rejectSend) throw Object.assign(new Error("User rejected"), { code: 4001 });
          window.__phantomSends++;
          const [, transfer, memoIx] = tx.instructions;
          const amount = new DataView(Uint8Array.from(transfer.data).buffer).getBigUint64(1, true);
          const sig = Array.from({ length: 88 }, () => A[Math.floor(Math.random() * A.length)]).join("");
          // Registra en el RPC simulado lo que el cliente REALMENTE envió (con manipulación opcional).
          await fetch("http://127.0.0.1:8899/__register", { method: "POST", body: JSON.stringify({
            signature: sig, mint: transfer.keys[1].pubkey.toBase58(), destination: o.destinationOverride ?? transfer.keys[2].pubkey.toBase58(),
            authority: pk.toBase58(), amount: (amount - BigInt(o.amountDelta || 0)).toString(),
            memo: o.memoOverride ?? new TextDecoder().decode(memoIx.data) }) });
          return { signature: sig };
        },
      };
    }, phantom === true ? {} : phantom);
  }
  return page;
}

// --- mini runner
const results = [];
export async function test(name, fn) {
  if (process.env.E2E_ONLY && !new RegExp(process.env.E2E_ONLY, "i").test(name)) return;
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true }); console.log(`  ✓ ${name} (${Date.now() - t0}ms)`); }
  catch (e) { results.push({ name, ok: false }); console.log(`  ✗ ${name}\n      ${String(e.message).split("\n").slice(0, 3).join("\n      ")}`); }
}
export function summary() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\nE2E: ${results.length - failed.length}/${results.length} OK`);
  return failed.length === 0;
}
export const text = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, " ").trim();

/** Pubkey base58 FUERA de la curva (una PDA): no admite ATA en el flujo de pago. */
export const randomOffCurvePubkey = () => execFileSync("node", ["-e",
  'const w=require("@solana/web3.js");console.log(w.PublicKey.findProgramAddressSync([Buffer.from(String(Math.random()))],w.Keypair.generate().publicKey)[0].toBase58())'],
  { cwd: root, encoding: "utf8" }).trim();

/** ATA de USDC (devnet) de una pubkey de Solana, calculada fuera del navegador. */
export const usdcAtaOf = (owner) => execFileSync("node", ["-e",
  `const w=require("@solana/web3.js"),t=require("@solana/spl-token");console.log(t.getAssociatedTokenAddressSync(new w.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),new w.PublicKey(process.argv[1])).toBase58())`, owner],
  { cwd: root, encoding: "utf8" }).trim();
export { cast };
