// Verificador REAL (verifier.server.ts) contra el contrato en anvil, con tx de Solana de fixture.
// Requiere anvil + .env.local cargado. Uso: npm run test:onchain
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { confirmPayment } from "../src/lib/confirmPayment";
import { DEFAULT_USDC_DEVNET_MINT as MINT } from "../src/lib/solana";
import { createConfirmDeps } from "../src/lib/verifier.server";
import { createObligation } from "../e2e/lib.mjs";
import { parsedPaymentTx } from "./fixtures-solana.mjs";

const VERIFIER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // anvil 0 = verifier
const OTHER_PK = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; // anvil 2: NO autorizada
const seller = Keypair.generate().publicKey.toBase58();
const AMOUNT = BigInt(500_000_000);
const sig = (c: string) => c.repeat(88);

const id = createObligation({ description: "test:onchain", solana: seller, count: 3 });
const depsWith = (pk: string | undefined, forNumber: number) => {
  if (pk) process.env.VERIFIER_PRIVATE_KEY = pk; else delete process.env.VERIFIER_PRIVATE_KEY;
  const d = createConfirmDeps();
  d.fetchSolanaTx = async () => parsedPaymentTx({ mint: MINT, seller, amount: AMOUNT, obligationId: id, number: forNumber });
  return d;
};
const run = (number: number, signature: string, pk: string | undefined = VERIFIER_PK, memoFor = number) =>
  confirmPayment({ obligationId: id, number, signature }, depsWith(pk, memoFor));

// sin clave del verifier → falla explícita (el route responde 500)
assert.throws(() => depsWith(undefined, 1), /VERIFIER_PRIVATE_KEY/);
// verifier no autorizado en el contrato → NotAuthorized → 502 y la cuota NO cambia
let r = await run(1, sig("a"), OTHER_PK);
assert.equal(r.status, 502, JSON.stringify(r)); assert.match(String(r.body.error), /NotAuthorized|autoriz|reverted/i);
// pago válido → 200 y PAID on-chain
r = await run(1, sig("a")); assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.body.paymentRef, sig("a"));
// misma cuota otra vez → 409 (ya pagada)
r = await run(1, sig("b")); assert.equal(r.status, 409);
// misma firma para otra cuota (memo de la cuota 2) → el contrato rechaza el ref reusado → 409 mapeado desde el revert real
r = await run(2, sig("a")); assert.equal(r.status, 409, JSON.stringify(r)); assert.match(String(r.body.error), /firma ya se usó/);
// firma nueva para la cuota 2 → ok
r = await run(2, sig("c")); assert.equal(r.status, 200, JSON.stringify(r));
console.log(`verificador on-chain real: OK (obligación #${id}: sin clave, no autorizado→502, válido→200, ya pagada→409, firma reusada→409)`);
