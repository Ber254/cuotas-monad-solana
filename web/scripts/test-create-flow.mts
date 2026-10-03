// Prueba la lógica del formulario (pura) y, si hay anvil en NEXT_PUBLIC_MONAD_RPC_URL, crea una
// obligación real con los mismos args que enviaría la UI. Uso: npm run test:create
import assert from "node:assert/strict";
import { createPublicClient, createWalletClient, http, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { installmentRegistryAbi } from "../src/lib/abi";
import { parseObligationForm, type ObligationFormValues } from "../src/lib/obligationForm";

const ALICE = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // anvil 0 (acreedor)
const PYME = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // anvil 1
const SOL = "11111111111111111111111111111111";
const NOW = Math.floor(Date.parse("2026-10-03T00:00:00Z") / 1000);
const base: ObligationFormValues = {
  description: "Capital de trabajo PYME", buyer: PYME, sellerSolanaAddress: SOL,
  totalUsdc: "10000", installmentCount: "10", firstDueDate: "2026-11-02", intervalDays: "30",
};
const bad = (o: Partial<ObligationFormValues>, acc: string | undefined = ALICE) => {
  const r = parseObligationForm({ ...base, ...o }, acc, NOW);
  assert.equal(r.ok, false, JSON.stringify(o));
};

// --- lógica pura
const ok = parseObligationForm(base, ALICE, NOW);
assert.ok(ok.ok);
assert.equal(ok.args[3], BigInt(1_000_000_000)); // 1.000 USDC
assert.equal(ok.args[4], 10);
assert.equal(ok.schedule.length, 10);
assert.equal(ok.schedule[1].dueDate - ok.schedule[0].dueDate, BigInt(30 * 86400));
assert.equal(ok.schedule[0].dueDate, ok.args[5]);
bad({ description: " " }); bad({ buyer: "0x123" }); bad({ buyer: ALICE }); bad({ buyer: "0x" + "0".repeat(40) });
bad({ sellerSolanaAddress: "" }); bad({ sellerSolanaAddress: "0OIl" + "1".repeat(30) });
bad({ installmentCount: "0" }); bad({ installmentCount: "61" }); bad({ installmentCount: "abc" });
bad({ totalUsdc: "0" }); bad({ totalUsdc: "-5" }); bad({ totalUsdc: "10000.0000001" });
bad({ totalUsdc: "10", installmentCount: "3" }); // 10 / 3 no divide exacto
bad({ firstDueDate: "2026-10-01" }); bad({ firstDueDate: "" }); bad({ intervalDays: "0" });
assert.ok(parseObligationForm({ ...base, installmentCount: "1", intervalDays: "0" }, ALICE, NOW).ok);
assert.ok(parseObligationForm({ ...base, totalUsdc: "10.50", installmentCount: "3" }, ALICE, NOW).ok); // 3.5 c/u
assert.ok(parseObligationForm({ ...base, buyer: PYME.toLowerCase() }, ALICE, NOW).ok);
console.log("lógica del formulario: OK");

// --- tx real contra anvil
const rpc = process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? "http://127.0.0.1:8545";
const registry = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}` | undefined;
if (!registry) { console.log("sin NEXT_PUBLIC_REGISTRY_ADDRESS: se omite la prueba on-chain"); process.exit(0); }
const pub = createPublicClient({ chain: foundry, transport: http(rpc) });
const wallet = createWalletClient({
  chain: foundry, transport: http(rpc),
  account: privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"),
});
const future = new Date(Date.now() + 40 * 86400_000).toISOString().slice(0, 10);
const form = parseObligationForm({ ...base, firstDueDate: future, installmentCount: "4", totalUsdc: "400" }, ALICE, Math.floor(Date.now() / 1000));
assert.ok(form.ok);
const hash = await wallet.writeContract({ address: registry, abi: installmentRegistryAbi, functionName: "createObligation", args: form.args });
const receipt = await pub.waitForTransactionReceipt({ hash });
const [ev] = parseEventLogs({ abi: installmentRegistryAbi, eventName: "ObligationCreated", logs: receipt.logs });
assert.ok(ev, "falta ObligationCreated");
const id = ev.args.obligationId;
const list = await pub.readContract({ address: registry, abi: installmentRegistryAbi, functionName: "getInstallments", args: [id] });
assert.equal(list.length, 4);
assert.ok(list.every((i) => i.status === 0 && i.amount === BigInt(100_000_000)));
assert.equal(list[3].dueDate, form.schedule[3].dueDate);
console.log(`tx on-chain: OK (obligación #${id}, 4 cuotas PENDING, vencimientos == vista previa)`);
