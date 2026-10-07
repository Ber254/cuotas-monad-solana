#!/usr/bin/env bash
# Regenera web/src/lib/abi.ts y web/src/lib/bytecode.ts desde el contrato compilado. Correr después de cambiar el contrato.
# (el bytecode permite desplegar desde la pantalla /admin/deploy firmando con la wallet, sin exponer claves)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"
forge build >/dev/null 2>&1
ABI="$(forge inspect InstallmentRegistry abi --json)"
{
  echo "// Generado por scripts/export-abi.sh — no editar a mano."
  echo "export const installmentRegistryAbi = ${ABI} as const;"
} > "$ROOT/web/src/lib/abi.ts"
BYTECODE="$(forge inspect InstallmentRegistry bytecode)"
{
  echo "// Generado por scripts/export-abi.sh — no editar a mano. Bytecode de creación de InstallmentRegistry."
  echo "export const installmentRegistryBytecode = \"${BYTECODE}\" as const;"
} > "$ROOT/web/src/lib/bytecode.ts"
echo "ABI exportado a web/src/lib/abi.ts y bytecode a web/src/lib/bytecode.ts"
