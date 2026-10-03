// E2E de la etapa 7 (marcar cuota pagada). Uso: node scripts/e2e-mark-paid.mjs <id>, donde <id> es una obligación
// recién creada de 2 cuotas, con acreedor = anvil 0 y deudor = anvil 1. Mismos requisitos que e2e-create-ui.mjs.
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";
const ID = process.argv[2];
const SELLER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", PYME = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const exe = fs.readdirSync("/opt/pw-browsers").filter(d => d.startsWith("chromium-"))[0];
const browser = await chromium.launch({ executablePath: `/opt/pw-browsers/${exe}/chrome-linux/chrome`, args: ["--no-sandbox"] });
async function open(account) {
  const page = await (await browser.newContext()).newPage();
  page.on("pageerror", e => console.log("PAGEERROR", e.message));
  await page.exposeFunction("__rpc", async (method, params) => {
    const r = await fetch("http://127.0.0.1:8545", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    const j = await r.json(); if (j.error) throw Object.assign(new Error(j.error.message), { code: j.error.code }); return j.result;
  });
  await page.addInitScript((A) => { let connected = false; window.ethereum = { request: async ({ method, params }) => method === "eth_requestAccounts" ? ((connected = true), [A]) : method === "eth_accounts" ? (connected ? [A] : []) : window.__rpc(method, params ?? []) }; }, account);
  await page.goto(`http://localhost:3100/obligations/${ID}`);
  return page;
}
// PYME: no ve el botón
let p = await open(PYME);
assert.equal(await p.locator('[data-testid="mark-paid"]').count(), 0, "sin conectar no hay botón");
await p.locator('[data-testid="mark-paid-connect"]').first().click();
await p.waitForSelector('text=Solo el acreedor');
assert.equal(await p.locator('[data-testid="mark-paid"]').count(), 0);
console.log("PYME: sin botón de pago OK");
// Acreedor: marca cuota 1 y 2
p = await open(SELLER);
await p.locator('[data-testid="mark-paid-connect"]').first().click();
await p.waitForSelector('[data-testid="mark-paid"]');
assert.equal(await p.locator('[data-testid="mark-paid"]').count(), 2);
await p.locator('[data-testid="mark-paid"]').first().click();
await p.fill('[data-testid="mark-paid-ref"]', "demo-ui-sig-1-" + ID);
await p.click('[data-testid="mark-paid-confirm"]');
await p.waitForSelector('[data-testid="installment-status"]:has-text("PAID")', { timeout: 20000 });
assert.equal(await p.locator('[data-testid="payment-ref"]:has-text("demo-ui-sig-1-' + ID + '")').count(), 1);
assert.equal((await p.locator('[data-testid="progress"]').innerText()).replace(/\s/g, ""), "1/2");
console.log("cuota 1 → PAID con paymentRef OK, progreso 1/2");
// Doble uso de ref → error legible
await p.waitForSelector('[data-testid="mark-paid"]');
await p.click('[data-testid="mark-paid"]');
await p.fill('[data-testid="mark-paid-ref"]', "demo-ui-sig-1-" + ID);
await p.click('[data-testid="mark-paid-confirm"]');
await p.waitForSelector('[data-testid="mark-paid-error"]', { timeout: 20000 });
console.log("ref repetida → error:", (await p.locator('[data-testid="mark-paid-error"]').innerText()).slice(0, 120));
await p.fill('[data-testid="mark-paid-ref"]', "demo-ui-sig-2-" + ID);
await p.click('[data-testid="mark-paid-confirm"]');
await p.waitForSelector('[data-testid="obligation-status"]:has-text("COMPLETED")', { timeout: 20000 });
assert.equal(await p.locator('[data-testid="installment-status"]:has-text("PAID")').count(), 2);
assert.equal(await p.locator('[data-testid="mark-paid-connect"]').count(), 0);
console.log("obligación COMPLETED, sin acciones restantes OK");
await browser.close(); console.log("E2E etapa 7: OK");
