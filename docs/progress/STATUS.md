# Status

_Última actualización: 2026-10-03 (Devin)._

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

## Parcialmente implementado
- `web/src/lib/registry.ts`: `getObligation` y `getInstallments` existen y tipan, pero ninguna página los usa todavía.

## Roto
- Nada conocido.

## Falta
- UI de detalle de obligación y cuotas (etapa 5 → `NEXT_TASK.md`).
- Crear obligación desde la UI con wallet EVM (etapa 6).
- Pago manual por el vendedor desde la UI (etapa 7).
- Todo Solana: pago USDC devnet + memo, verificador `/api/payments/confirm` (etapas 8–9).
- Deploy de `web/` en Vercel (etapa 12).
- Todavía no hay obligaciones creadas en Monad Testnet (no se sembró la demo para no crear datos con un comprador ficticio).

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
- Manual: con el flujo local, `http://localhost:3000` debe mostrar "Obligaciones registradas: 1".
- Si cambiás el contrato: `./scripts/export-abi.sh` para regenerar `web/src/lib/abi.ts`.

## Direcciones desplegadas
| Red | InstallmentRegistry | verifier | fecha |
|---|---|---|---|
| Monad Testnet (10143) | [`0xF7a6e0f226ecDc708Af88679F2A9a557E918C321`](https://testnet.monadexplorer.com/address/0xF7a6e0f226ecDc708Af88679F2A9a557E918C321) | `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc` (= owner/deployer) | 2026-10-03, tx [`0xc4db6db4…`](https://testnet.monadexplorer.com/tx/0xc4db6db49374aff5c5c6a92b24aac41043ed19d92f9776749f8534affb4f6efd) |

## Última tarea realizada
Deploy de `InstallmentRegistry` en Monad Testnet y verificación de lectura desde la web. Antes: base del MVP (estructura, docs, contrato con tests, scripts, web).

## Próxima tarea recomendada
Página `/obligations/[id]` con la tabla de cuotas (etapa 5). Detalle en `NEXT_TASK.md`.

## Credenciales
- La clave del deployer/verifier (wallet MetaMask de Bernardo `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc`, solo testnet) está guardada como secreto de Devin `MONAD_DEPLOYER_PRIVATE_KEY`. **Nunca** commitearla ni ponerla en variables `NEXT_PUBLIC_*`. En Claude Code / local, usarla desde una variable de entorno o `.env` (ignorado por git).
