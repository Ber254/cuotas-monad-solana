// RPC de Solana simulado (puerto 8899) para pruebas locales sin acceso a devnet.
//  - POST /__register  {signature, mint, destination, authority, amount, memo, err?}: el Phantom simulado
//    registra lo que el CLIENTE realmente armó y envió.
//  - JSON-RPC getTransaction(signature): devuelve ese pago en formato `jsonParsed`.
// Así el verificador del servidor contrasta la tx real del cliente contra lo que exige el contrato.
// Uso: npx tsx scripts/mock-solana-rpc.mts
import http from "node:http";
import { decodeTransferCheckedInstruction } from "@solana/spl-token";
import { Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { DEFAULT_USDC_DEVNET_MINT } from "../src/lib/solana";
import { parsedPaymentTx } from "./fixtures-solana.mjs";

type Registered = { mint: string; destination: string; authority: string; amount: string; memo: string; err?: unknown };
const registered = new Map<string, Registered>();
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("content-type", "application/json");
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
    if (req.url === "/__register") {
      const { signature, ...rest } = JSON.parse(body);
      registered.set(signature, rest);
      res.end('{"ok":true}');
      return;
    }
    const { id, method, params } = JSON.parse(body);
    let result: unknown = null;
    if (method === "getLatestBlockhash") result = { context: { slot: 1 }, value: { blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 100 } };
    if (method === "getSignatureStatuses") result = { context: { slot: 1 }, value: params[0].map((sg: string) => (registered.has(sg) ? { slot: 1, confirmations: 1, err: null, confirmationStatus: "confirmed" } : null)) };
    if (method === "getTokenAccountBalance") result = { context: { slot: 1 }, value: { amount: process.env.MOCK_BALANCE ?? "5000000000", decimals: 6, uiAmount: 5000, uiAmountString: "5000" } };
    if (method === "sendTransaction") {
      // Decodifica los BYTES firmados que envió el cliente (no un resumen) y los registra como pago.
      const tx = Transaction.from(Buffer.from(params[0], "base64"));
      if (!tx.verifySignatures()) { res.end(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32003, message: "Transaction signature verification failure" } })); return; }
      const sig = bs58.encode(tx.signature!);
      const t = decodeTransferCheckedInstruction(tx.instructions[1]);
      registered.set(sig, { mint: t.keys.mint.pubkey.toBase58(), destination: t.keys.destination.pubkey.toBase58(), authority: t.keys.owner.pubkey.toBase58(),
        amount: t.data.amount.toString(), memo: tx.instructions[2].data.toString("utf8") });
      result = sig;
    }
    if (method === "getVersion") result = { "solana-core": "mock", "feature-set": 0 };
    if (method === "getAccountInfo" && params[0] === DEFAULT_USDC_DEVNET_MINT) {
      result = { context: { slot: 1 }, value: { lamports: 1, owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", executable: false, rentEpoch: 0, space: 82,
        data: { program: "spl-token", space: 82, parsed: { type: "mint", info: { decimals: 6, supply: "1000000", mintAuthority: "mock", isInitialized: true, freezeAuthority: null } } } } };
    }
    if (method === "getTransaction" && registered.has(params[0])) {
      const r = registered.get(params[0])!;
      result = parsedPaymentTx({ mint: r.mint, seller: Keypair.generate().publicKey.toBase58(), destination: r.destination,
        payer: r.authority, amount: BigInt(r.amount), obligationId: "0", number: 0, memo: r.memo, err: r.err });
    }
    res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
  });
}).listen(8899, "127.0.0.1", () => console.log("mock Solana RPC en :8899"));
