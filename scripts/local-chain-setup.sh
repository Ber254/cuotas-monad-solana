#!/usr/bin/env bash
# Despliega InstallmentRegistry en anvil local, crea la obligación demo y escribe web/.env.local.
# Requiere anvil corriendo en otra terminal: `anvil`
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="http://127.0.0.1:8545"
# Cuentas públicas por defecto de anvil (solo para desarrollo local).
SELLER_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" # cuenta 0 = acreedor/inversor (seller) y verifier
BUYER_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"                      # cuenta 1 = PYME deudora (buyer)
SELLER_SOLANA_ADDRESS="${SELLER_SOLANA_ADDRESS:-11111111111111111111111111111111}"

cd "$ROOT/contracts"
OUT="$(forge script script/Deploy.s.sol --rpc-url "$RPC" --private-key "$SELLER_PK" --broadcast 2>&1)"
REGISTRY="$(echo "$OUT" | grep -oE 'InstallmentRegistry: 0x[0-9a-fA-F]{40}' | awk '{print $2}')"
[ -n "$REGISTRY" ] || { echo "$OUT"; echo "No se pudo desplegar"; exit 1; }

REGISTRY_ADDRESS="$REGISTRY" BUYER_ADDRESS="$BUYER_ADDRESS" SELLER_SOLANA_ADDRESS="$SELLER_SOLANA_ADDRESS" \
  forge script script/SeedDemo.s.sol --rpc-url "$RPC" --private-key "$SELLER_PK" --broadcast >/dev/null 2>&1

cat > "$ROOT/web/.env.local" <<ENV
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_MONAD_RPC_URL=$RPC
NEXT_PUBLIC_REGISTRY_ADDRESS=$REGISTRY
ENV
echo "InstallmentRegistry: $REGISTRY (obligación demo #1 creada)"
echo "web/.env.local escrito. Ahora: cd web && npm run dev"
