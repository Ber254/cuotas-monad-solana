// RPC de Solana simulado (puerto 8899) para pruebas locales sin acceso a devnet.
//  - POST /__register  {signature, mint, destination, authority, amount, memo, err?}: el Phantom simulado
//    registra lo que el CLIENTE realmente armó y envió.
//  - JSON-RPC getTransaction(signature): devuelve ese pago en formato `jsonParsed`.
// Así el verificador del servidor contrasta la tx real del cliente contra lo que exige el contrato.
// Uso: npx tsx scripts/mock-solana-rpc.mts
import http from "node:http";
import { Keypair } from "@solana/web3.js";
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
    if (method === "getTransaction" && registered.has(params[0])) {
      const r = registered.get(params[0])!;
      result = parsedPaymentTx({ mint: r.mint, seller: Keypair.generate().publicKey.toBase58(), destination: r.destination,
        payer: r.authority, amount: BigInt(r.amount), obligationId: "0", number: 0, memo: r.memo, err: r.err });
    }
    res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
  });
}).listen(8899, "127.0.0.1", () => console.log("mock Solana RPC en :8899"));
