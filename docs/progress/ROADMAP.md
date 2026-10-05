# Roadmap

Etapas chicas e independientes. ✅ = terminada **y probada**; 🟡 = parcial; ⬜ = pendiente.

| # | Etapa | Estado | Cómo se verifica |
|---|---|---|---|
| 1 | Inicialización del proyecto (estructura, docs/progress, README) | ✅ | Este repo |
| 2 | Modelo de obligación y cuotas | ✅ | `docs/progress/ARCHITECTURE.md` + structs del contrato |
| 3 | Smart contract en Monad (`InstallmentRegistry`) | ✅ | `forge test` pasa (10 tests). Desplegado en Monad Testnet: `0xF7a6e0f226ecDc708Af88679F2A9a557E918C321` |
| 4 | UI base (Next.js + viem leyendo el contrato) | ✅ | Home muestra red, contrato y `obligationCount` leído on-chain (probado con anvil) |
| 5 | Visualización de cuotas (`/obligations/[id]`) + listado en home | ✅ | Probado con anvil + curl: 10 filas PENDING, pago de cuota 1 → PAID con `paymentRef`, 10 pagadas → COMPLETED, 404 en `/obligations/999`, `/abc`, `/0` |
| 6 | Flujo de creación de obligación (form + wallet EVM) | ✅ | `/obligations/new`. Probado con `npm run test:create` (lógica + tx anvil) y E2E Chromium con wallet inyectada → anvil. **MetaMask real no probado** |
| 7 | Pago manual de cuota (acreedor marca PAID desde la UI) | ✅ | E2E Chromium (`web/scripts/e2e-mark-paid.mjs`): la PYME no ve el botón, el acreedor marca PAID con `paymentRef`, ref repetida → error legible, 2/2 → COMPLETED. MetaMask real no probado |
| 8 | Integración Solana: pagar con USDC devnet + memo (Phantom) | 🟡 | Tx verificada offline y en E2E con Phantom simulado. **Falta una tx real en devnet** (bloqueada en el entorno de desarrollo) |
| 9 | Confirmación automática: `/api/payments/confirm` | 🟡 | Probado: verificador real vs contrato en anvil (`test:onchain`) + endpoint HTTP real + E2E, con RPC Solana simulado. **Falta contra Solana real** |
| 10 | Demo end-to-end (PYME, 10 cuotas, todas pagadas → COMPLETED) | 🟡 | Local ✅: E2E paga las 10 cuotas por Solana (simulada) → COMPLETED, con capturas y guion `DEMO.md`. **Falta la corrida con redes y wallets reales** |
| 11 | Testing (unit del verificador Solana, e2e) | ✅ | `./scripts/run-local-e2e.sh`: forge 10/10, `test:create`, `test:solana`, `test:verify`, `test:onchain`, E2E 19/19 |
| 12 | Deploy (Monad Testnet + Vercel para `web/`) | ⬜ | URL pública. En Vercel: Root Directory = `web` |

Notas:
- Las etapas 5–7 se pueden hacer contra anvil local sin Monad Testnet.
