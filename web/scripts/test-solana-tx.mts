// Prueba offline (sin red) de la tx de pago en Solana. Uso: npm run test:solana
import assert from "node:assert/strict";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, decodeTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MEMO_PROGRAM_ID, DEFAULT_USDC_DEVNET_MINT, buildPaymentInstructions, buildPaymentTransaction, paymentMemo } from "../src/lib/solana";

const payer = Keypair.generate();
const seller = Keypair.generate().publicKey;
const mint = new PublicKey(DEFAULT_USDC_DEVNET_MINT);
const amount = BigInt(1_000_000_000); // 1.000 USDC

const ixs = buildPaymentInstructions({ payer: payer.publicKey, seller, mint, amount, obligationId: BigInt(7), number: 3 });
assert.equal(ixs.length, 3);
// 1) ATA idempotente del acreedor
assert.equal(ixs[0].programId.toBase58(), ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
assert.equal(ixs[0].data[0], 1, "debe ser la variante idempotente (1)");
// 2) transferChecked con monto/decimales/destino exactos
assert.equal(ixs[1].programId.toBase58(), TOKEN_PROGRAM_ID.toBase58());
const t = decodeTransferCheckedInstruction(ixs[1]);
assert.equal(t.data.amount, amount);
assert.equal(t.data.decimals, 6);
assert.equal(t.keys.mint.pubkey.toBase58(), mint.toBase58());
assert.equal(t.keys.destination.pubkey.toBase58(), getAssociatedTokenAddressSync(mint, seller).toBase58());
assert.equal(t.keys.source.pubkey.toBase58(), getAssociatedTokenAddressSync(mint, payer.publicKey).toBase58());
assert.equal(t.keys.owner.pubkey.toBase58(), payer.publicKey.toBase58());
// 3) memo
assert.equal(ixs[2].programId.toBase58(), MEMO_PROGRAM_ID.toBase58());
assert.equal(ixs[2].data.toString("utf8"), "cuotas:7:3");
assert.equal(paymentMemo("7", 3), "cuotas:7:3");
// La tx se compila, firma y serializa con un blockhash dummy
const tx = buildPaymentTransaction({ payer: payer.publicKey, seller, mint, amount, obligationId: BigInt(7), number: 3 }, Keypair.generate().publicKey.toBase58());
tx.sign(payer);
assert.ok(tx.serialize().length > 0);
assert.ok(tx.verifySignatures());
console.log("tx de pago Solana: OK (ATA idempotente + transferChecked + memo cuotas:7:3, firma verificada)");
