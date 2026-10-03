// RPC de Solana simulado: responde getTransaction (jsonParsed) con un pago válido según MOCK_* env.
// Uso: MOCK_OBLIGATION=<id> MOCK_NUMBER=<n> MOCK_SELLER=<pubkey> MOCK_AMOUNT=<min units> tsx scripts/mock-solana-rpc.mts
import http from "node:http";
import { DEFAULT_USDC_DEVNET_MINT } from "../src/lib/solana";
import { parsedPaymentTx, SIG } from "./fixtures-solana.mjs";

const tx = parsedPaymentTx({
  mint: process.env.MOCK_MINT ?? DEFAULT_USDC_DEVNET_MINT,
  seller: process.env.MOCK_SELLER!,
  amount: BigInt(process.env.MOCK_AMOUNT!),
  obligationId: process.env.MOCK_OBLIGATION!,
  number: Number(process.env.MOCK_NUMBER!),
});
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const { id, method, params } = JSON.parse(body);
    const result = method === "getTransaction" && params[0] === SIG ? tx : null;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
  });
}).listen(8899, () => console.log("mock Solana RPC en :8899"));
