// E2E de /obligations/new con Chromium (playwright-core) y una wallet EVM falsa que reenvía a anvil.
// Requisitos: anvil + ./scripts/local-chain-setup.sh, `npm run build && npm run start -- -p 3100`,
// y `npm i --no-save playwright-core`. Ajustar la ruta de Chromium (PLAYWRIGHT_BROWSERS_PATH) si hace falta.
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
const exe = (await import("node:fs")).readdirSync("/opt/pw-browsers").filter(d=>d.startsWith("chromium-"))[0];
const browser = await chromium.launch({ executablePath: `/opt/pw-browsers/${exe}/chrome-linux/chrome`, args:["--no-sandbox"] });
const page = await browser.newPage();
page.on("pageerror", e => console.log("PAGEERROR", e.message));
// Wallet falsa: reenvía JSON-RPC a anvil (cuenta 0 desbloqueada, 31337).
await page.exposeFunction("__rpc", async (method, params) => {
  const r = await fetch("http://127.0.0.1:8545", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({jsonrpc:"2.0",id:1,method,params}) });
  const j = await r.json(); if (j.error) throw Object.assign(new Error(j.error.message), {code:j.error.code}); return j.result;
});
await page.addInitScript(() => {
  const A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  window.ethereum = { request: async ({method, params}) => {
    if (method === "eth_requestAccounts" || method === "eth_accounts") return [A];
    return window.__rpc(method, params ?? []);
  }};
});
await page.goto("http://localhost:3100/");
await page.click('[data-testid="new-obligation"]');
await page.waitForURL("**/obligations/new");
assert.equal(await page.isDisabled('[data-testid="submit"]'), true, "submit debe estar deshabilitado sin wallet");
await page.click('[data-testid="connect-wallet"]');
await page.waitForSelector('[data-testid="account"]:has-text("0xf39F")');
await page.fill('input[name=buyer]', "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
await page.fill('input[name=sellerSolanaAddress]', "11111111111111111111111111111111");
await page.fill('input[name=totalUsdc]', "3000"); await page.fill('input[name=installmentCount]', "6");
assert.equal(await page.locator('[data-testid="preview-row"]').count(), 6);
// error: PYME = acreedor
await page.fill('input[name=buyer]', "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
assert.ok(await page.locator('[data-testid="form-errors"]').isVisible()); assert.equal(await page.isDisabled('[data-testid="submit"]'), true);
await page.fill('input[name=buyer]', "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
await page.click('[data-testid="submit"]');
await page.waitForURL(/\/obligations\/\d+$/, { timeout: 30000 });
console.log("redirigió a", page.url());
assert.equal(await page.locator('[data-testid="installment-row"]').count(), 6);
assert.equal(await page.locator('[data-testid="installment-status"]:has-text("PENDING")').count(), 6);
console.log("cuota:", (await page.locator('[data-testid="installment-amount"]').innerText()));
await page.screenshot({ path: "/tmp/e2e-detail.png", fullPage: true });
await page.goto("http://localhost:3100/obligations/new"); await page.screenshot({ path: "/tmp/e2e-new.png", fullPage: true });
await browser.close(); console.log("E2E UI: OK");
