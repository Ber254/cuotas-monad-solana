// Prueba offline del verificador y del núcleo del endpoint. Uso: npm run test:verify
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { confirmPayment, type ConfirmDeps } from "../src/lib/confirmPayment";
import { DEFAULT_USDC_DEVNET_MINT as MINT } from "../src/lib/solana";
import { createRateLimiter } from "../src/lib/rateLimit";
import { verifyPaymentTx } from "../src/lib/verifyPayment";
import { SIG, parsedPaymentTx } from "./fixtures-solana.mjs";

const seller = Keypair.generate().publicKey.toBase58();
const AMOUNT = BigInt(500_000_000);
const exp = { mint: MINT, sellerSolanaAddress: seller, amount: AMOUNT, obligationId: "7", number: 2 };
const base = { mint: MINT, seller, amount: AMOUNT, obligationId: "7", number: 2 };
const v = (o: object) => verifyPaymentTx(parsedPaymentTx({ ...base, ...o }), exp);

// --- verificador puro
assert.equal(v({}).ok, true);
assert.equal(v({ amount: AMOUNT + BigInt(1) }).ok, true, "monto mayor se acepta");
for (const [name, o] of Object.entries({
  "monto menor": { amount: AMOUNT - BigInt(1) },
  "mint incorrecto": { mint: Keypair.generate().publicKey.toBase58() },
  "destino incorrecto": { destination: Keypair.generate().publicKey.toBase58() },
  "memo de otra cuota": { memo: "cuotas:7:3" },
  "memo de otra obligación": { memo: "cuotas:8:2" },
  "sin memo": { noMemo: true },
  "decimales incorrectos": { decimals: 9 },
  "tx fallida": { err: { InstructionError: [0, "Custom"] } },
})) assert.equal(v(o).ok, false, name);
assert.equal(verifyPaymentTx(null, exp).ok, false);
// Phantom/RPC pueden agregar instrucciones (compute budget, sin parsear): no deben afectar
{
  const tx = parsedPaymentTx(base);
  tx.transaction.message.instructions.unshift(
    { programId: Keypair.generate().publicKey, accounts: [], data: "3DdGGhkhJbjm" } as never,
    { program: "unknown", programId: Keypair.generate().publicKey, parsed: { type: "setComputeUnitLimit" } } as never);
  assert.equal(verifyPaymentTx(tx, exp).ok, true, "instrucciones extra ignoradas");
}
console.log("verifyPaymentTx: OK (1 válido + 9 inválidos rechazados)");

// --- núcleo del endpoint con dependencias simuladas
let marked: unknown[] = [];
const deps = (over: Partial<ConfirmDeps> = {}): ConfirmDeps => ({
  usdcMint: MINT,
  readObligation: async (id) => id === BigInt(7) ? { sellerSolanaAddress: seller, installments: [
    { number: 1, amount: AMOUNT, status: "PAID" }, { number: 2, amount: AMOUNT, status: "PENDING" } ] } : null,
  fetchSolanaTx: async () => parsedPaymentTx(base),
  markPaid: async (...a) => { marked.push(a); return "0xhash"; },
  ...over,
});
const call = (i: object, d = deps()) => confirmPayment({ obligationId: "7", number: 2, signature: SIG, ...i }, d);
let r = await call({}); assert.equal(r.status, 200); assert.deepEqual(marked, [[BigInt(7), 2, SIG]]);
marked = [];
for (const [i, st] of [[{ obligationId: "abc" }, 400], [{ number: 0 }, 400], [{ signature: "x" }, 400], [{ obligationId: "9" }, 404], [{ number: 5 }, 404], [{ number: 1 }, 409]] as const) {
  r = await call(i); assert.equal(r.status, st, JSON.stringify(i));
}
r = await call({}, deps({ fetchSolanaTx: async () => null })); assert.equal(r.status, 404); assert.equal(r.body.retryable, true);
r = await call({}, deps({ fetchSolanaTx: async () => parsedPaymentTx({ ...base, amount: BigInt(1) }) })); assert.equal(r.status, 422);
r = await call({}, deps({ markPaid: async () => { throw Object.assign(new Error("x"), { name: "PaymentRefAlreadyUsed" }); } })); assert.equal(r.status, 409);
r = await call({}, deps({ markPaid: async () => { throw new Error("rpc caído"); } })); assert.equal(r.status, 502);
assert.deepEqual(marked, [], "nunca se llama a markPaid si algo falla antes");
console.log("confirmPayment: OK (200, 400, 404, 409, 422, 502; no escribe en cadena ante datos inválidos)");

// --- rate limiter
let clock = 0;
const allow = createRateLimiter(3, 1000, () => clock);
assert.deepEqual([1, 2, 3, 4, 5].map(() => allow("ip-a")), [true, true, true, false, false]);
assert.equal(allow("ip-b"), true, "otra IP no se ve afectada");
clock = 1000; assert.equal(allow("ip-a"), true, "la ventana se reinicia");
console.log("rateLimit: OK");
