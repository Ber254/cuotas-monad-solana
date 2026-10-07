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
| 8 | Integración Solana: pagar con USDC devnet + memo (Phantom) | 🟡 | **Pago real en devnet ✅ (por CLI `pay:devnet`, misma tx que la UI)**. Falta probar con **Phantom en el navegador** |
| 9 | Confirmación automática: `/api/payments/confirm` | ✅ | **Probado contra Solana devnet y Monad Testnet reales** (2026-10-07): tx real aceptada (HTTP 200) y cuota marcada PAID on-chain; ver STATUS (firma y hash). Además `test:verify`, `test:onchain`, E2E |
| 10 | Demo end-to-end (proveedor, PYME, 10 pagarés, todas pagadas → COMPLETED) | 🟡 | Local ✅: E2E paga las 10 cuotas por Solana (simulada) → COMPLETED, con capturas y guion `DEMO.md`. Real ✅ para el primer pagaré por CLI (STATUS); **falta** la corrida completa en UI con Phantom/MetaMask y la cesión real |
| 11 | Testing (unit del verificador Solana, e2e) | ✅ | `./scripts/run-local-e2e.sh`: forge 10/10, `test:create`, `test:solana`, `test:verify`, `test:onchain`, E2E 28/28 (+ forge 16/16) |
| 12 | Deploy (Monad Testnet + Vercel para `web/`) | 🟡 | Contrato en Monad Testnet ✅ (Devin). Web **preparada y verificada en local** con la config de Testnet (build, `check:deploy` anti-fuga, `/api/health`, degradación sin RPC) + guía `DEPLOY.md`. **No desplegada en Vercel** (sin acceso) |
| 13 | Cesión de pagarés (el proveedor cede cuotas a un tercero) | 🟡 | Contrato + 16 tests forge, UI (acreedor por pagaré, panel de cesión, "Mis pagarés"), verificador contra el acreedor actual, `/admin/deploy`; E2E 28/28 (pago al nuevo acreedor ✓, pago a la cuenta anterior rechazado ✓; mutación comprobada). **Falta redesplegar en Monad Testnet y probar con wallets reales** |

Notas:
- Las etapas 5–7 se pueden hacer contra anvil local sin Monad Testnet.
