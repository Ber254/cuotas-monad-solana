// Suite E2E completa (Chromium + wallets simuladas + anvil + RPC Solana simulado).
// Se corre con scripts/run-local-e2e.sh, que levanta anvil, el mock de Solana y la web.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ACCOUNTS, BASE, advanceDays, closeBrowser, createObligation, launch, newPage, randomOffCurvePubkey, randomSolanaPubkey, summary, test, text } from "./lib.mjs";

const SHOTS = process.env.E2E_SHOTS_DIR ?? path.resolve(import.meta.dirname, "../../docs/progress/demo");
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
const statuses = async (page) => (await page.locator('[data-testid="installment-status"]').allInnerTexts()).map((s) => s.trim());
const goto = (page, p) => page.goto(BASE + p, { waitUntil: "networkidle" });
const noPageErrors = (page) => assert.deepEqual(page.errors, [], "errores de JS en la página");
const SELLER_SOL = randomSolanaPubkey();

async function payFirstWithSolana(page, paidAfter, total) {
  await page.locator('[data-testid="pay-solana"]').first().click();
  await page.waitForFunction(([n, t]) => document.querySelector('[data-testid="progress"]')?.textContent.replace(/\s/g, "") === `${n}/${t}`,
    [paidAfter, total], { timeout: 30000 });
}
async function fillForm(page, v = {}) {
  await page.fill("input[name=buyer]", v.buyer ?? ACCOUNTS.pyme);
  await page.fill("input[name=sellerSolanaAddress]", v.solana ?? SELLER_SOL);
  await page.fill("input[name=totalUsdc]", v.total ?? "1000");
  await page.fill("input[name=installmentCount]", v.count ?? "2");
}

await launch();

// ───────────────────────── 1. Lectura / navegación ─────────────────────────
console.log("\n[1] Lectura y navegación");
await test("home lista la obligación demo y enlaza al detalle", async () => {
  const page = await newPage();
  await goto(page, "/");
  assert.ok((await page.locator('[data-testid="obligation-link"]').count()) >= 1);
  assert.match(await text(page, '[data-testid="obligation-count"]'), /^\d+$/);
  await page.locator('[data-testid="obligation-link"]').last().click();
  await page.waitForURL(/\/obligations\/\d+$/);
  noPageErrors(page);
});
await test("detalle explica dónde interviene Monad y Solana", async () => {
  const page = await newPage();
  await goto(page, "/obligations/1");
  const panel = await text(page, '[data-testid="chains-panel"]');
  assert.match(panel, /Monad — registro verificable/);
  assert.match(panel, /Solana — riel de pago/);
});
await test("/api/health: configuración lista y contrato legible (sin exponer secretos)", async () => {
  const res = await fetch(`${BASE}/api/health`);
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.config.verifierKeyConfigured, true);
  assert.match(body.obligationCount, /^\d+$/);
  assert.ok(!JSON.stringify(body).includes("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"), "no debe exponer la clave");
});
await test("404 para ids inexistentes o inválidos", async () => {
  const page = await newPage();
  for (const id of ["999999", "abc", "0", "-1", "1.5"]) assert.equal((await page.goto(`${BASE}/obligations/${id}`)).status(), 404, id);
});
await test("detalle en móvil (390px) no desborda horizontalmente la página", async () => {
  const page = await newPage({ viewport: { width: 390, height: 800 } });
  await goto(page, "/obligations/1");
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(sw <= iw, `scrollWidth ${sw} > innerWidth ${iw}`);
  await shot(page, "mobile-detail.png");
});

// ───────────────────────── 2. DEMO: 10 cuotas pagadas con Solana ─────────────────────────
console.log("\n[2] DEMO end-to-end: PYME, USD 10.000 en 10 cuotas, pagadas con Solana");
await test("obligación #1 → 10 cuotas pagadas por Solana → COMPLETED", async () => {
  const page = await newPage({ evm: { startConnected: false }, phantom: true });
  await goto(page, "/");
  await shot(page, "01-home.png");
  await goto(page, "/obligations/1");
  assert.equal((await statuses(page)).filter((s) => s === "PENDING").length, 10, "la demo debe partir con 10 PENDING");
  assert.equal(await text(page, '[data-testid="total-amount"]'), "10.000 USDC");
  await shot(page, "02-detalle-pendiente.png");
  await payFirstWithSolana(page, 1, 10);
  assert.equal((await statuses(page))[0], "PAID");
  assert.match(await text(page, '[data-testid="outstanding"]'), /^9\.000 USDC$/);
  assert.equal(await page.locator('[data-testid="payment-ref-link"]').count(), 1, "la ref de Solana enlaza al explorer");
  await shot(page, "03-cuota-1-pagada.png");
  for (let n = 2; n <= 10; n++) await payFirstWithSolana(page, n, 10);
  assert.equal(await text(page, '[data-testid="obligation-status"]'), "COMPLETED");
  assert.equal((await statuses(page)).filter((s) => s === "PAID").length, 10);
  assert.equal(await text(page, '[data-testid="outstanding"]'), "0 USDC");
  assert.equal(await page.evaluate(() => window.__phantomSends), 10, "exactamente 10 pagos en Solana");
  await shot(page, "04-completada.png");
  noPageErrors(page);
});
await test("PAID/COMPLETED persisten tras recargar (fuente de verdad: Monad)", async () => {
  const page = await newPage();
  await goto(page, "/obligations/1");
  assert.equal(await text(page, '[data-testid="obligation-status"]'), "COMPLETED");
  assert.equal(await page.locator('[data-testid="pay-solana"]').count(), 0, "sin botones de pago en cuotas pagadas");
});

// ───────────────────────── 3. Crear obligación ─────────────────────────
console.log("\n[3] Crear obligación (wallet EVM)");
await test("formulario crea la obligación y redirige al detalle", async () => {
  const page = await newPage({ evm: {} });
  await goto(page, "/obligations/new");
  assert.equal(await page.isDisabled('[data-testid="submit"]'), true, "submit deshabilitado sin wallet");
  await page.click('[data-testid="connect-wallet"]');
  await page.waitForSelector('[data-testid="account"]:has-text("0xf39F")');
  await fillForm(page, { total: "3000", count: "6" });
  assert.equal(await page.locator('[data-testid="preview-row"]').count(), 6);
  await shot(page, "05-nueva-obligacion.png");
  await page.click('[data-testid="submit"]');
  await page.waitForURL(/\/obligations\/\d+$/, { timeout: 30000 });
  assert.equal((await statuses(page)).length, 6);
  assert.equal(await text(page, '[data-testid="installment-amount"]'), "6 × 500 USDC");
});
await test("validación: PYME = acreedor, monto no divisible, cuotas > 60", async () => {
  const page = await newPage({ evm: {} });
  await goto(page, "/obligations/new");
  await page.click('[data-testid="connect-wallet"]');
  await page.waitForSelector('[data-testid="account"]:has-text("0xf39F")');
  await fillForm(page, { buyer: ACCOUNTS.seller });
  assert.match(await text(page, '[data-testid="form-errors"]'), /misma wallet/);
  await fillForm(page, { total: "10", count: "3" });
  assert.match(await text(page, '[data-testid="form-errors"]'), /dividirse exacto/);
  await fillForm(page, { count: "61" });
  assert.match(await text(page, '[data-testid="form-errors"]'), /entre 1 y 60/);
  await fillForm(page, { count: "2", solana: randomOffCurvePubkey() });
  assert.match(await text(page, '[data-testid="form-errors"]'), /PDA\/programa/);
  assert.equal(await page.isDisabled('[data-testid="submit"]'), true);
});
await test("sin wallet instalada: mensaje claro", async () => {
  const page = await newPage();
  await goto(page, "/obligations/new");
  await page.click('[data-testid="connect-wallet"]');
  assert.match(await text(page, '[data-testid="tx-error"]'), /No se detectó una wallet EVM/);
});
await test("el usuario rechaza conectar / firmar → mensaje de rechazo", async () => {
  let page = await newPage({ evm: { rejectConnect: true } });
  await goto(page, "/obligations/new");
  await page.click('[data-testid="connect-wallet"]');
  assert.match(await text(page, '[data-testid="tx-error"]'), /Rechazaste la operación/);
  page = await newPage({ evm: { rejectSend: true } });
  await goto(page, "/obligations/new");
  await page.click('[data-testid="connect-wallet"]');
  await page.waitForSelector('[data-testid="account"]:has-text("0xf39F")');
  await fillForm(page);
  await page.click('[data-testid="submit"]');
  await page.waitForSelector('[data-testid="tx-error"]');
  assert.match(await text(page, '[data-testid="tx-error"]'), /Rechazaste la operación/);
  assert.equal(await page.isDisabled('[data-testid="submit"]'), false, "se puede reintentar");
});
await test("red equivocada → pide cambiar de red; red desconocida → la agrega", async () => {
  for (const [opts, expected] of [[{ wrongChain: true }, "wallet_switchEthereumChain"], [{ wrongChain: true, unknownChain: true }, "wallet_addEthereumChain"]]) {
    const page = await newPage({ evm: opts });
    await goto(page, "/obligations/new");
    await page.click('[data-testid="connect-wallet"]');
    await page.waitForSelector('[data-testid="account"]:has-text("0xf39F")');
    await fillForm(page);
    await page.click('[data-testid="submit"]');
    await page.waitForURL(/\/obligations\/\d+$/, { timeout: 30000 });
    assert.ok((await page.evaluate(() => window.__evmCalls)).includes(expected), expected);
  }
});

// ───────────────────────── 4. Pago manual del acreedor ─────────────────────────
console.log("\n[4] Confirmación manual del acreedor");
await test("solo el acreedor marca PAID; ref repetida falla; cambio de cuenta; COMPLETED", async () => {
  const id = createObligation({ description: "E2E manual", solana: SELLER_SOL });
  const pyme = await newPage({ evm: { account: ACCOUNTS.pyme, startConnected: true } });
  await goto(pyme, `/obligations/${id}`);
  await pyme.waitForSelector("text=Solo el acreedor");
  assert.equal(await pyme.locator('[data-testid="mark-paid"]').count(), 0);

  const page = await newPage({ evm: { startConnected: true } });
  await goto(page, `/obligations/${id}`);
  await page.waitForSelector('[data-testid="mark-paid"]');
  // cambia a la cuenta de la PYME desde la wallet → el botón desaparece; vuelve → reaparece
  await page.evaluate((a) => window.ethereum.__emit("accountsChanged", [a]), ACCOUNTS.pyme);
  await page.waitForSelector("text=Solo el acreedor");
  await page.evaluate((a) => window.ethereum.__emit("accountsChanged", [a]), ACCOUNTS.seller);
  await page.waitForSelector('[data-testid="mark-paid"]');

  await page.locator('[data-testid="mark-paid"]').first().click();
  await page.fill('[data-testid="mark-paid-ref"]', `manual-e2e-${id}-1`);
  await page.click('[data-testid="mark-paid-confirm"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="progress"]')?.textContent.replace(/\s/g, "") === "1/2");
  await page.locator('[data-testid="mark-paid"]').first().click();
  await page.fill('[data-testid="mark-paid-ref"]', `manual-e2e-${id}-1`);
  await page.click('[data-testid="mark-paid-confirm"]');
  await page.waitForSelector('[data-testid="mark-paid-error"]');
  assert.match(await text(page, '[data-testid="mark-paid-error"]'), /ya fue usada/);
  await page.fill('[data-testid="mark-paid-ref"]', `manual-e2e-${id}-2`);
  await page.click('[data-testid="mark-paid-confirm"]');
  await page.waitForSelector('[data-testid="obligation-status"]:has-text("COMPLETED")');
});
await test("el acreedor rechaza la firma en la wallet → mensaje y se puede reintentar", async () => {
  const id = createObligation({ description: "E2E rechazo", solana: SELLER_SOL });
  const page = await newPage({ evm: { startConnected: true, rejectSend: true } });
  await goto(page, `/obligations/${id}`);
  await page.waitForSelector('[data-testid="mark-paid"]');
  await page.locator('[data-testid="mark-paid"]').first().click();
  await page.click('[data-testid="mark-paid-confirm"]');
  await page.waitForSelector('[data-testid="mark-paid-error"]');
  assert.match(await text(page, '[data-testid="mark-paid-error"]'), /Rechazaste la operación/);
  assert.equal(await page.isDisabled('[data-testid="mark-paid-confirm"]'), false);
});

// ───────────────────────── 5. Pago Solana: casos de error ─────────────────────────
console.log("\n[5] Pago con Solana: errores y manipulaciones");
const solErr = async (page, label = "") => {
  await page.locator('[data-testid="pay-solana"]').first().click();
  try { await page.waitForSelector('[data-testid="pay-solana-error"]', { timeout: 8000 }); }
  catch { throw new Error(`[${label}] no apareció pay-solana-error; envíos a Phantom: ${await page.evaluate(() => window.__phantomSends)}; fila: ` + + (await text(page, "tbody tr")).slice(0, 120) + " | JS: " + page.errors.join(";")); }
  return text(page, '[data-testid="pay-solana-error"]');
};
await test("sin Phantom / usuario rechaza / sin saldo / acreedor inválido", async () => {
  const id = createObligation({ description: "E2E solana errores", solana: SELLER_SOL });
  let page = await newPage();
  await goto(page, `/obligations/${id}`);
  assert.match(await solErr(page, "sin-phantom"), /No se detectó Phantom/);
  page = await newPage({ phantom: { rejectConnect: true } });
  await goto(page, `/obligations/${id}`);
  assert.match(await solErr(page, "rechaza-connect"), /Rechazaste la operación en Phantom/);
  page = await newPage({ phantom: { rejectSend: true } });
  await goto(page, `/obligations/${id}`);
  assert.match(await solErr(page, "rechaza-send"), /Rechazaste la operación en Phantom/);
  page = await newPage({ phantom: true, solBalance: "1" });
  await goto(page, `/obligations/${id}`);
  assert.match(await solErr(page, "sin-saldo"), /Saldo de USDC devnet insuficiente/);
  const bad = createObligation({ description: "E2E acreedor fuera de curva", solana: randomOffCurvePubkey() });
  page = await newPage({ phantom: true });
  await goto(page, `/obligations/${bad}`);
  assert.match(await solErr(page, "acreedor-invalido"), /no es una wallet válida/);
  assert.equal(await page.evaluate(() => window.__phantomSends), 0, "no se envió ningún pago");
});
for (const [name, opts, re] of [
  ["pago por monto menor al de la cuota → el servidor lo rechaza, cuota sigue PENDING", { amountDelta: 1 }, /monto/],
  ["memo de otra cuota → el servidor lo rechaza, cuota sigue PENDING", { memoOverride: "cuotas:1:99" }, /memo/],
]) {
  await test(name, async () => {
    const id = createObligation({ description: "E2E manipulación", solana: SELLER_SOL });
    const page = await newPage({ phantom: opts });
    await goto(page, `/obligations/${id}`);
    await page.locator('[data-testid="pay-solana"]').first().click();
    await page.waitForSelector('[data-testid="confirm-error"]', { timeout: 30000 });
    assert.match(await text(page, '[data-testid="confirm-error"]'), re);
    assert.equal(await page.evaluate(() => window.__phantomSends), 1);
    await page.click('[data-testid="retry-verify"]');
    await page.waitForSelector('[data-testid="confirm-error"]');
    assert.equal(await page.evaluate(() => window.__phantomSends), 1, "reintentar la verificación NO vuelve a cobrar");
    await goto(page, `/obligations/${id}`);
    assert.deepEqual(await statuses(page), ["PENDING", "PENDING"]);
  });
}
await test("falla transitoria del servidor → 'Reintentar verificación' completa sin cobrar dos veces", async () => {
  const id = createObligation({ description: "E2E reintento", solana: SELLER_SOL });
  const page = await newPage({ phantom: true });
  let calls = 0;
  await page.route("**/api/payments/confirm", (route) => (calls++ === 0
    ? route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "fallo transitorio" }) })
    : route.continue()));
  await goto(page, `/obligations/${id}`);
  await page.locator('[data-testid="pay-solana"]').first().click();
  await page.waitForSelector('[data-testid="confirm-error"]');
  assert.match(await text(page, '[data-testid="confirm-error"]'), /fallo transitorio/);
  await page.click('[data-testid="retry-verify"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="progress"]')?.textContent.replace(/\s/g, "") === "1/2", null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__phantomSends), 1);
});
await test("endpoint: 400/404/409/422 y rate limit 429 vía HTTP real", async () => {
  const post = (b) => fetch(`${BASE}/api/payments/confirm`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" }, body: typeof b === "string" ? b : JSON.stringify(b) });
  assert.equal((await post("no-json")).status, 400);
  assert.equal((await post({ obligationId: "1", number: 1, signature: "x" })).status, 400);
  assert.equal((await post({ obligationId: "999999", number: 1, signature: "7".repeat(88) })).status, 404);
  assert.equal((await post({ obligationId: "1", number: 1, signature: "7".repeat(88) })).status, 409, "cuota ya pagada");
  let last;
  for (let i = 0; i < 40; i++) last = (await post({ obligationId: "1", number: 1, signature: "7".repeat(88) })).status;
  assert.equal(last, 429, "rate limit tras 30 pedidos/min por IP");
});

await test("CLI pay:devnet: bytes firmados reales → RPC → verificador → PAID (sin navegador)", async () => {
  const id = createObligation({ description: "E2E CLI", solana: SELLER_SOL });
  const kp = path.join(os.tmpdir(), `finvia-e2e-payer-${process.pid}.json`);
  fs.writeFileSync(kp, execFileSync("node", ["-e", 'const k=require("@solana/web3.js").Keypair.generate();console.log(JSON.stringify(Array.from(k.secretKey)))'], { encoding: "utf8" }));
  const out = execFileSync("npx", ["tsx", "scripts/pay-devnet.mts", "--keypair", kp, "--obligation", id, "--number", "1", "--confirm", BASE],
    { encoding: "utf8", env: { ...process.env, SOLANA_RPC_URL: "http://127.0.0.1:8899" } });
  fs.rmSync(kp);
  assert.match(out, /Confirmada en Solana/);
  assert.match(out, /confirm intento 1: HTTP 200/);
  const page = await newPage();
  await goto(page, `/obligations/${id}`);
  assert.deepEqual(await statuses(page), ["PAID", "PENDING"]);
  assert.equal(await page.locator('[data-testid="payment-ref-link"]').count(), 1);
});

// ───────────────────────── 6. OVERDUE (viaje en el tiempo, va al final) ─────────────────────────
console.log("\n[6] Vencimientos (OVERDUE derivado del tiempo)");
await test("cuota vencida se muestra OVERDUE y aun así se puede pagar", async () => {
  const id = createObligation({ description: "E2E vencida", solana: SELLER_SOL, firstDueInDays: 5, count: 2, intervalDays: 30 });
  const page = await newPage({ evm: { startConnected: true }, phantom: true });
  await goto(page, `/obligations/${id}`);
  assert.deepEqual(await statuses(page), ["PENDING", "PENDING"]);
  assert.equal(await text(page, '[data-testid="overdue-count"]'), "0");
  advanceDays(6);
  await goto(page, `/obligations/${id}`);
  assert.deepEqual(await statuses(page), ["OVERDUE", "PENDING"]);
  assert.equal(await text(page, '[data-testid="overdue-count"]'), "1");
  await shot(page, "06-cuota-vencida.png");
  await payFirstWithSolana(page, 1, 2);
  assert.deepEqual(await statuses(page), ["PAID", "PENDING"]);
  assert.equal(await text(page, '[data-testid="overdue-count"]'), "0");
});

await closeBrowser();
process.exit(summary() ? 0 : 1);
