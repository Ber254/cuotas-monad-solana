# Roadmap

Etapas chicas e independientes. ✅ = terminada **y probada**; 🟡 = parcial; ⬜ = pendiente.

| # | Etapa | Estado | Cómo se verifica |
|---|---|---|---|
| 1 | Inicialización del proyecto (estructura, docs/progress, README) | ✅ | Este repo |
| 2 | Modelo de obligación y cuotas | ✅ | `docs/progress/ARCHITECTURE.md` + structs del contrato |
| 3 | Smart contract en Monad (`InstallmentRegistry`) | ✅ | `forge test` pasa (10 tests). Desplegado en Monad Testnet: `0xF7a6e0f226ecDc708Af88679F2A9a557E918C321` |
| 4 | UI base (Next.js + viem leyendo el contrato) | ✅ | Home muestra red, contrato y `obligationCount` leído on-chain (probado con anvil) |
| 5 | Visualización de cuotas (`/obligations/[id]`) + listado en home | ✅ | Probado con anvil + curl: 10 filas PENDING, pago de cuota 1 → PAID con `paymentRef`, 10 pagadas → COMPLETED, 404 en `/obligations/999`, `/abc`, `/0` |
| 6 | Flujo de creación de obligación (form + wallet EVM) | ⬜ | Ver `NEXT_TASK.md`. Crear desde la UI con MetaMask y verla en la página de detalle |
| 7 | Pago manual de cuota (vendedor marca PAID desde la UI) | ⬜ | Botón visible solo al vendedor; cuota pasa a PAID |
| 8 | Integración Solana: pagar con USDC devnet + memo (Phantom) | ⬜ | Tx visible en Solana explorer devnet con memo `cuotas:<id>:<n>` |
| 9 | Confirmación automática: `/api/payments/confirm` verifica tx Solana y llama `markInstallmentPaid` | ⬜ | Cuota pasa a PAID con `paymentRef` = firma Solana |
| 10 | Demo end-to-end (Alice/Bob, 10 cuotas, todas pagadas → COMPLETED) | ⬜ | Guion de demo en `STATUS.md` |
| 11 | Testing (unit del verificador Solana, e2e básico) | ⬜ | |
| 12 | Deploy (Monad Testnet + Vercel para `web/`) | ⬜ | URL pública. En Vercel: Root Directory = `web` |

Notas:
- Las etapas 5–7 se pueden hacer contra anvil local sin Monad Testnet.
