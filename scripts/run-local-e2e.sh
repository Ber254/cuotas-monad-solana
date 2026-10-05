#!/usr/bin/env bash
# Corre TODO localmente: tests del contrato, lint/tsc/build, tests unitarios y la suite E2E
# (anvil + RPC de Solana simulado + web en producción + Chromium con wallets simuladas).
# Requisitos: forge/anvil/cast, Node 20+, Chromium para playwright-core (PLAYWRIGHT_BROWSERS_PATH).
# Sin acceso a foundryup: exportar FOUNDRY_SOLC=<shim solc> FOUNDRY_OFFLINE=true (ver docs/progress/STATUS.md).
# Uso: ./scripts/run-local-e2e.sh        (E2E_SKIP_UNIT=1 para saltar los tests unitarios)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done; }
trap cleanup EXIT
fail() { echo "✗ $1"; exit 1; }
LOG="${TMPDIR:-/tmp}/finvia-e2e"; mkdir -p "$LOG"

if [ -z "${E2E_SKIP_UNIT:-}" ]; then
  echo "== contratos"; (cd "$ROOT/contracts" && forge test 2>&1 | grep -E "Suite result|FAIL") || fail "forge test"
fi

echo "== anvil + deploy + obligación demo"
anvil > "$LOG/anvil.log" 2>&1 & PIDS+=($!)
for _ in $(seq 30); do curl -s -o /dev/null localhost:8545 -X POST -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' && break; sleep 0.5; done
"$ROOT/scripts/local-chain-setup.sh" || fail "setup local"

cd "$ROOT/web"
if [ -z "${E2E_SKIP_UNIT:-}" ]; then
  echo "== lint + tsc"; npm run lint >/dev/null 2>&1 || fail "lint"; npx tsc --noEmit || fail "tsc"
  echo "== tests unitarios"
  set -a; . ./.env.local; set +a
  npm run test:create 2>&1 | tail -2; npm run test:solana 2>&1 | tail -1; npm run test:verify 2>&1 | tail -2
  npm run test:onchain 2>&1 | tail -3 || fail "test:onchain"
fi
set -a; . ./.env.local; set +a

echo "== build + chequeo de secretos del bundle"
export VERIFIER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
npm run build >/dev/null 2>&1 || fail "build"
npm run check:deploy || fail "check:deploy (fuga de secretos o contrato no embebido)"
echo "== servidores"
npx tsx scripts/mock-solana-rpc.mts > "$LOG/mock.log" 2>&1 & PIDS+=($!)
SOLANA_RPC_URL=http://127.0.0.1:8899 \
  npm run start -- -p 3100 > "$LOG/web.log" 2>&1 & PIDS+=($!)
for _ in $(seq 40); do curl -s -o /dev/null localhost:3100 && break; sleep 0.5; done

echo "== E2E"
node e2e/run.mjs
