# Status

_Última actualización: 2026-10-03 (Devin)._

## Terminado y probado
- Estructura del repo, documentación de continuidad (`docs/progress/`) y README principal.
- Modelo de datos de obligación y cuotas (ver `ARCHITECTURE.md`).
- Contrato `contracts/src/InstallmentRegistry.sol`: crear obligación + generar N cuotas, marcar cuota PAID (verifier o vendedor), OVERDUE derivado por tiempo, COMPLETED automático, anti doble pago y anti reuso de `paymentRef`. **10 tests `forge test` pasando.**
- Scripts Foundry: `script/Deploy.s.sol`, `script/SeedDemo.s.sol` (obligación demo Celular, 10 × 100 USDC, mensual). Probados contra anvil.
- `scripts/local-chain-setup.sh`: anvil → deploy → obligación demo → escribe `web/.env.local`. Probado.
- `web/` Next.js 15 + viem: home lee red/contrato/`obligationCount` desde la cadena. Probado con anvil (muestra `1` después del seed). `lint`, `tsc` y `build` pasan.

## Funcionando
- Flujo local: anvil + contrato + web leyendo on-chain.

## Parcialmente implementado
- `web/src/lib/registry.ts`: `getObligation` y `getInstallments` existen y tipan, pero ninguna página los usa todavía.
- Monad Testnet: config lista (chainId 10143, RPC en `foundry.toml` como `monad_testnet`), **contrato no desplegado** (falta una wallet con MON de faucet).

## Roto
- Nada conocido.

## Falta
- UI de detalle de obligación y cuotas (etapa 5 → `NEXT_TASK.md`).
- Crear obligación desde la UI con wallet EVM (etapa 6).
- Pago manual por el vendedor desde la UI (etapa 7).
- Todo Solana: pago USDC devnet + memo, verificador `/api/payments/confirm` (etapas 8–9).
- Deploy en Monad Testnet y Vercel (etapa 12).

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

Deploy a Monad Testnet (cuando haya wallet con MON):
```bash
cd contracts
VERIFIER_ADDRESS=0x<verifier> forge script script/Deploy.s.sol --rpc-url monad_testnet --private-key $DEPLOYER_PK --broadcast
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
| Monad Testnet | — (pendiente) | — | — |

## Última tarea realizada
Base del MVP: estructura, docs de continuidad, contrato `InstallmentRegistry` con tests, scripts de deploy/seed, web Next.js leyendo el contrato.

## Próxima tarea recomendada
Página `/obligations/[id]` con la tabla de cuotas (etapa 5). Detalle en `NEXT_TASK.md`.
