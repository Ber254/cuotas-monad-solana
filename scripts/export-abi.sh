#!/usr/bin/env bash
# Regenera web/src/lib/abi.ts desde el contrato compilado. Correr después de cambiar el contrato.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"
forge build >/dev/null 2>&1
ABI="$(forge inspect InstallmentRegistry abi --json)"
{
  echo "// Generado por scripts/export-abi.sh — no editar a mano."
  echo "export const installmentRegistryAbi = ${ABI} as const;"
} > "$ROOT/web/src/lib/abi.ts"
echo "ABI exportado a web/src/lib/abi.ts"
