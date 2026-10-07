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
| 10 | Demo end-to-end (proveedor, PYME, pagarés, todos pagados → COMPLETED) | ✅ | **Real**: obligación #1 creada desde la UI, 2 pagarés pagados en Solana devnet con verificación y registro en Monad Testnet, con cesión intermedia (ver STATUS). Los pagos se hicieron por CLI; **falta repetir el pago desde el navegador con Phantom** |
| 11 | Testing (unit del verificador Solana, e2e) | ✅ | `./scripts/run-local-e2e.sh`: forge 10/10, `test:create`, `test:solana`, `test:verify`, `test:onchain`, E2E 28/28 (+ forge 16/16) |
| 12 | Deploy (Monad Testnet + Vercel para `web/`) | ✅ | Contrato en Monad Testnet ✅ (`0x8d7c…`) y web en Vercel ✅ (https://cuotas-monad-solana-fjez.vercel.app); `/api/health` ok con la clave del verifier verificada contra el contrato. Falta probar un pago real contra el verificador de Vercel; borrar el proyecto Vercel viejo |
| 13 | Cesión de pagarés (el proveedor cede cuotas a un tercero) | ✅ | **Probada con redes reales** (2026-10-07): cesión desde la UI con MetaMask, pago al acreedor nuevo verificado y registrado (ver STATUS) + contrato 16 tests, E2E 28/28. Límites en D22 |

Notas:
- Las etapas 5–7 se pueden hacer contra anvil local sin Monad Testnet.
