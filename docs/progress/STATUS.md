# Status

_Última actualización: 2026-10-03 (Claude Code, continuando a Devin)._

## Terminado y probado
- Estructura del repo, documentación de continuidad (`docs/progress/`) y README principal.
- Modelo de datos de obligación y cuotas (ver `ARCHITECTURE.md`).
- Contrato `contracts/src/InstallmentRegistry.sol`: crear obligación + generar N cuotas, marcar cuota PAID (verifier o vendedor), OVERDUE derivado por tiempo, COMPLETED automático, anti doble pago y anti reuso de `paymentRef`. **10 tests `forge test` pasando.**
- Scripts Foundry: `script/Deploy.s.sol`, `script/SeedDemo.s.sol` (obligación demo Celular, 10 × 100 USDC, mensual). Probados contra anvil.
- `scripts/local-chain-setup.sh`: anvil → deploy → obligación demo → escribe `web/.env.local`. Probado.
- `web/` Next.js 15 + viem: home lee red/contrato/`obligationCount` desde la cadena. Probado con anvil (muestra `1` después del seed) y contra Monad Testnet (muestra `0`). `lint`, `tsc` y `build` pasan.
- **Contrato desplegado en Monad Testnet** (ver tabla "Direcciones desplegadas"). Verificado con `cast`: `owner` y `verifier` = wallet del deployer, `obligationCount` = 0.

## Funcionando
- Flujo local: anvil + contrato + web leyendo on-chain.
- Web leyendo el contrato real en Monad Testnet con `NEXT_PUBLIC_CHAIN_ID=10143` y `NEXT_PUBLIC_REGISTRY_ADDRESS` de la tabla.

## Etapa 5 (hecha por Claude Code): visualización
- `/obligations/[id]`: encabezado (descripción, estado, deudor/PYME, acreedor, cuenta Solana, monto total, cuota, progreso, saldo, próximo vencimiento, cuotas vencidas), tabla de cuotas (N°, monto, vencimiento, estado con badge, pagada el, `paymentRef`), nota de dónde interviene Monad (registro) y Solana (pago, aún no implementado). 404 para id inválido o inexistente.
- Home: renombrada a Finvia, lista hasta 50 obligaciones recientes con link, monto total, progreso y estado.
- `data-testid`: `installment-row`, `installment-status`, `payment-ref`, `obligation-status`, `progress`, `outstanding`, `obligation-link`.
- Demo seed cambiada a Finvia: "Capital de trabajo PYME", 10 × 1.000 USDC (D14).

## Etapa 6 (hecha por Claude Code): crear obligación desde la UI
- `/obligations/new` (Client Component): botón conectar wallet (cambia/agrega la red si hace falta), formulario (descripción, PYME deudora, cuenta Solana del acreedor, monto total USDC, cuotas, primer vencimiento, intervalo), validación espejo del contrato, vista previa del calendario de cuotas, envío de `createObligation`, espera de receipt y redirección a `/obligations/<id>` (id del evento `ObligationCreated`). Link "+ Nueva obligación" en home.
- Tests: `cd web && set -a && . ./.env.local && set +a && npm run test:create` (lógica pura + tx real a anvil). E2E UI: `web/scripts/e2e-create-ui.mjs` (instrucciones en el encabezado).
- **No probado:** MetaMask real (se usó una wallet inyectada que reenvía a anvil, cuenta 0 desbloqueada); creación en Monad Testnet; el rechazo en wallet (código 4001) está implementado pero no ejercitado.

## Etapa 7 (hecha por Claude Code): pago manual por el acreedor
- Columna "Acción" en `/obligations/[id]`: `MarkPaidButton` (Client Component) por cuota no pagada. Autodetecta la wallet; solo el acreedor (`seller`) ve "Marcar pagada"; pide una referencia (default `manual-<id>-<n>-<ts>`), simula, envía `markInstallmentPaid`, y refresca. Los demás ven "Solo el acreedor". Aclara que es confirmación manual sin verificar Solana.
- Probado: E2E Chromium con wallet inyectada → anvil (`web/scripts/e2e-mark-paid.mjs <id>`); lint, tsc, build, `forge test` (10/10) y `npm run test:create`.
- Bug encontrado y corregido durante la prueba: cada fila tenía su propio estado de wallet (solo una fila mostraba el botón) → ver D17.
- **No probado:** MetaMask real, Monad Testnet, múltiples cuentas cambiando en caliente (el evento `accountsChanged` de la wallet no se escucha: tras cambiar de cuenta hay que reconectar/recargar).

## Probado en esta sesión (etapa 5)
- `forge test`: 10/10 pasan.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: pasan.
- Anvil + `local-chain-setup.sh` + `next start`: `/obligations/1` → 10 filas PENDING, total 10.000 USDC; tras `markInstallmentPaid(1,1,"demo-sig-1")` → 1 PAID con `paymentRef`, progreso 1/10; tras pagar las 10 → obligación COMPLETED, saldo 0; `/obligations/999`, `/abc`, `/0` → 404; home lista 1 link.
- **No probado:** OVERDUE en la UI (requiere avanzar tiempo en anvil: `cast rpc evm_increaseTime`; sí está cubierto en el test del contrato), Monad Testnet con datos (no hay obligaciones allá), render visual en navegador (solo se verificó HTML por curl).

## Entorno (nota para agentes en contenedores sin acceso a foundry.paradigm.xyz)
`foundryup` y la descarga de solc suelen estar bloqueados. Workaround usado: `npm i -g @foundry-rs/forge @foundry-rs/anvil @foundry-rs/cast`, y un shim sobre `solc` (npm) pasado con `FOUNDRY_SOLC=<shim> FOUNDRY_OFFLINE=true`. Con acceso normal, `forge test` funciona sin nada de esto. Los submódulos se inicializan con `git submodule update --init --recursive`.

## Roto
- Nada conocido.

## Falta
- Todo Solana: pago USDC devnet + memo (etapa 8 → `NEXT_TASK.md`) y verificador `/api/payments/confirm` (etapa 9).
- Deploy de `web/` en Vercel (etapa 12).
- Todavía no hay obligaciones creadas en Monad Testnet (no se sembró la demo para no crear datos con un deudor ficticio).

## Cómo ejecutar

Requisitos: Node 20+ (probado con 22), [Foundry](https://getfoundry.sh) (`forge`, `anvil`, `cast`).

```bash
git clone --recurse-submodules https://github.com/Ber254/cuotas-monad-solana
# si ya clonaste sin submódulos:
git submodule update --init --recursive

# Contrato
cd contracts && forge test

# Local end-to-end
anvil                                  # terminal 1
./scripts/local-chain-setup.sh         # terminal 2, desde la raíz
cd web && npm install && npm run dev   # http://localhost:3000
```

Re-deploy a Monad Testnet (solo si cambia el contrato; registrar la nueva dirección abajo y en DECISIONS.md):
```bash
cd contracts
VERIFIER_ADDRESS=0x<verifier> forge script script/Deploy.s.sol --rpc-url monad_testnet --private-key $MONAD_DEPLOYER_PRIVATE_KEY --broadcast
```
Luego poner la dirección en `web/.env.local` (`NEXT_PUBLIC_CHAIN_ID=10143`, `NEXT_PUBLIC_REGISTRY_ADDRESS=...`) y registrarla acá.

## Cómo probar
- Contrato: `cd contracts && forge test -vv`.
- Web: `cd web && npm run lint && npx tsc --noEmit && npm run build`.
- Manual: con el flujo local, `http://localhost:3000` debe mostrar "Obligaciones registradas: 1" y `/obligations/1` 10 cuotas PENDING de 1.000 USDC.
- Si cambiás el contrato: `./scripts/export-abi.sh` para regenerar `web/src/lib/abi.ts`.

## Direcciones desplegadas
| Red | InstallmentRegistry | verifier | fecha |
|---|---|---|---|
| Monad Testnet (10143) | [`0xF7a6e0f226ecDc708Af88679F2A9a557E918C321`](https://testnet.monadexplorer.com/address/0xF7a6e0f226ecDc708Af88679F2A9a557E918C321) | `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc` (= owner/deployer) | 2026-10-03, tx [`0xc4db6db4…`](https://testnet.monadexplorer.com/tx/0xc4db6db49374aff5c5c6a92b24aac41043ed19d92f9776749f8534affb4f6efd) |

## Última tarea realizada
Etapa 7: botón de pago manual del acreedor. Antes: etapa 6 (formulario de creación), etapa 5 (detalle/listado, rebranding Finvia). Antes (Devin): base del MVP y deploy en Monad Testnet.

## Próxima tarea recomendada
Etapa 8: pago de una cuota con USDC devnet + memo desde Phantom. Detalle en `NEXT_TASK.md`.

## Credenciales
- La clave del deployer/verifier (wallet MetaMask de Bernardo `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc`, solo testnet) está guardada como secreto de Devin `MONAD_DEPLOYER_PRIVATE_KEY`. **Nunca** commitearla ni ponerla en variables `NEXT_PUBLIC_*`. En Claude Code / local, usarla desde una variable de entorno o `.env` (ignorado por git).
