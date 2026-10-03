# Cuotas — Monad + Solana

MVP de hackathon: **pagarés / obligaciones de pago en cuotas**.

Ejemplo: Alice le vende un celular a Bob en 10 cuotas mensuales de 100 USDC. La obligación y sus cuotas se registran en **Monad**; cada cuota se paga en **USDC sobre Solana**; cuando el pago se confirma la cuota pasa a `PAID`, y cuando todas están pagadas la obligación pasa a `COMPLETED`.

```
crear obligación → generar cuotas → ver cuotas → "Pagar" → pago USDC en Solana
→ verificación → cuota PAID → todas pagadas → obligación COMPLETED
```

## Estructura

| Carpeta | Qué hay |
|---|---|
| `contracts/` | Contrato Solidity `InstallmentRegistry` (Foundry) — cadena principal: Monad |
| `web/` | App Next.js 15 + viem |
| `scripts/` | `local-chain-setup.sh` (entorno local con anvil), `export-abi.sh` |
| `docs/progress/` | **Estado del proyecto y próxima tarea** — leer primero |

## Quick start

```bash
git clone --recurse-submodules https://github.com/Ber254/cuotas-monad-solana
cd cuotas-monad-solana
(cd contracts && forge test)
anvil &                              # cadena local
./scripts/local-chain-setup.sh       # deploy + obligación demo + web/.env.local
cd web && npm install && npm run dev # http://localhost:3000
```

Requisitos: Node 20+, [Foundry](https://getfoundry.sh).

## Estado

Ver [`docs/progress/STATUS.md`](docs/progress/STATUS.md) y [`docs/progress/NEXT_TASK.md`](docs/progress/NEXT_TASK.md).
