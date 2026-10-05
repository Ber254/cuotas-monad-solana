# Status

_Última actualización: 2026-10-05 (Claude Code, continuando a Devin)._

## Resumen
MVP de Finvia **completo y probado en local** (anvil + Chromium con wallets simuladas + RPC de Solana simulado): crear obligación → cuotas → pagar cada cuota en USDC por Solana → el servidor verifica y marca PAID en Monad → obligación COMPLETED. **Lo único sin probar es contra las redes reales** (Solana devnet, Monad Testnet) y con wallets reales (MetaMask, Phantom): desde el entorno de desarrollo ambas redes están bloqueadas (HTTP 403 del proxy; verificado de nuevo el 2026-10-05). Eso es lo primero que hay que hacer con acceso (ver `NEXT_TASK.md`).

## Qué había al empezar (Devin)
Contrato `InstallmentRegistry` con 10 tests, scripts Foundry, `local-chain-setup.sh`, web Next.js que solo mostraba `obligationCount`, docs de continuidad y deploy en Monad Testnet (`0xF7a6…C321`, sin obligaciones).

## Qué se implementó (Claude Code)
| Etapa | Qué | Cómo se probó | Límite |
|---|---|---|---|
| 5 | `/obligations/[id]` (detalle + cuotas + panel "dónde interviene Monad y Solana"), listado en home, rebranding Finvia | E2E + capturas | — |
| 6 | `/obligations/new`: wallet EVM, validación espejo del contrato (incluye acreedor Solana on-curve), vista previa, `createObligation` | `test:create`, E2E (rechazo 4001, sin wallet, red equivocada/desconocida, validaciones) | MetaMask real no |
| 7 | Marcar cuota PAID por el acreedor (`MarkPaidButton`), cambio de cuenta (`accountsChanged`) | E2E (solo acreedor, ref repetida, rechazo, COMPLETED) | MetaMask real no |
| 8 | Pago USDC en Solana vía Phantom: ATA idempotente + `transferChecked` + memo `cuotas:<id>:<n>` | `test:solana` (offline), E2E (Phantom simulado: sin Phantom, rechazo, sin saldo, acreedor fuera de curva) | **Sin tx real en devnet**; mint USDC sin verificar |
| 9 | `POST /api/payments/confirm` (verificador), rate limit 30/min/IP, "Reintentar verificación" | `test:verify`, `test:onchain` (verificador real vs contrato), E2E (monto menor y memo ajeno rechazados con 422, reintento sin doble cobro, 400/404/409/429) | **`getParsedTransaction` real sin probar** (fixtures según documentación) |
| 10 | Demo end-to-end ejecutable + guion (`DEMO.md`) + capturas (`docs/progress/demo/`) | E2E: 10 cuotas pagadas por Solana → COMPLETED | Simulada (ver arriba) |
| 11 | Testing | batería completa `./scripts/run-local-e2e.sh` | — |
| 12 | Preparación de deploy: `/api/health`, `error.tsx`, timeouts RPC, `runtime/maxDuration`, `check:deploy` (anti-fuga de secretos), guía `DEPLOY.md` | build con config de Testnet; `check:deploy` limpio y con 4 fugas simuladas detectadas; health 503/200; degradación sin RPC (home 200 con error, detalle 500 + pantalla de error, confirm 502); batería completa | **No desplegado en Vercel**; Testnet inalcanzable desde aquí |

## Cómo se prueba todo (un comando)
```bash
# desde la raíz; requiere forge/anvil/cast, Node 20+, Chromium (PLAYWRIGHT_BROWSERS_PATH)
(cd web && npm ci)
./scripts/run-local-e2e.sh        # contratos + lint + tsc + tests unitarios + build + E2E (20 casos)
```
Último resultado (2026-10-05): `forge test` 10/10; lint/tsc/build OK; `test:create`, `test:solana`, `test:verify`, `test:onchain` OK; **E2E 20/20** (con `/api/health`). Variables útiles: `E2E_SKIP_UNIT=1`, `E2E_ONLY=<regex de nombre de test>`. El E2E regenera las capturas de `docs/progress/demo/`.

Cómo funciona la simulación (importante para no confundirla con una prueba real):
- **EVM**: `window.ethereum` falso que reenvía a anvil (cuentas desbloqueadas). **Phantom**: `window.solana` falso que, al "enviar", registra en `web/scripts/mock-solana-rpc.mts` lo que el *cliente realmente armó* (mint, destino, monto, memo). El servidor consulta ese mock como si fuera Solana y verifica contra los datos del **contrato**. Por eso la tx del cliente y el verificador del servidor quedan contrastados entre sí, pero ninguno contra Solana real.

## Bugs reales hallados y corregidos al probar
- Una fila por wallet: solo la fila donde se conectaba mostraba "Marcar pagada" (D17).
- Rechazo del usuario al firmar salía en inglés ("User rejected the request."): viem anida el 4001.
- Detalle desbordaba en móvil (468px en 390px) y "10" + "1.000" se leían "101.000".
- **Error mío corregido:** documenté que `1111…1` (system program) no admitía ATA; es falso, **está on-curve** y el pago funcionó. Las que no admiten ATA son direcciones fuera de curva (PDAs). Ahora el formulario rechaza esas al crear la obligación y el pago las rechaza también (y hay tests con una PDA real).

## Sin probar / riesgos (honesto)
- Nada contra **Solana devnet** ni **Monad Testnet**; nada con **MetaMask/Phantom** reales. El formato `jsonParsed` real podría diferir de las fixtures → el verificador rechazaría pagos válidos; probar primero eso.
- Mint USDC devnet `4zMMC9sr…ZKqt` sin verificar on-chain (configurable con `NEXT_PUBLIC_SOLANA_USDC_MINT` / `SOLANA_USDC_MINT`).
- El endpoint de confirmación es público: rate limit en memoria (no sirve con varias instancias, p. ej. serverless) y sin autenticación; cualquiera con una firma válida puede disparar el registro (idempotente). La identidad Solana del pagador no se liga al `buyer` EVM (D19).
- **Despliegue (etapa 12) no hecho.** Antes de desplegar leer `DEPLOY.md` § 0: la clave del verifier NO debe ser la wallet personal owner/deployer (D21). Las `NEXT_PUBLIC_*` se fijan en build.
- Hallazgo propio al probar `check:deploy`: la primera versión daba ✓ sin comparar el secreto cuando la variable no estaba definida (falso OK). Corregido: avisa y revisa además las variables `NEXT_PUBLIC_*`.
- La UI de Monad Testnet mostrará "Monad (Monad Testnet)"; en anvil dice "(Foundry)".

## Entorno (contenedores sin acceso a foundry.paradigm.xyz)
`foundryup` y la descarga de solc suelen estar bloqueados. Workaround usado: `npm i -g @foundry-rs/forge @foundry-rs/anvil @foundry-rs/cast`, y un shim de `solc` (paquete npm `solc` 0.8.28, wasm) con la interfaz CLI de solc, pasado con `FOUNDRY_SOLC=<shim> FOUNDRY_OFFLINE=true`. Con acceso normal no hace falta nada de esto. Submódulos: `git submodule update --init --recursive`.

## Roto
- Nada conocido.

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
- Todo junto: `./scripts/run-local-e2e.sh` (ver arriba). Individual: `cd web && npm run lint && npx tsc --noEmit && npm run build`, `npm run test:create|test:solana|test:verify|test:onchain` (los que usan anvil necesitan `set -a; . ./.env.local; set +a`).
- Manual: con el flujo local, `http://localhost:3000` debe mostrar "Obligaciones registradas: 1" y `/obligations/1` 10 cuotas PENDING de 1.000 USDC.
- Si cambiás el contrato: `./scripts/export-abi.sh` para regenerar `web/src/lib/abi.ts`.

## Direcciones desplegadas
| Red | InstallmentRegistry | verifier | fecha |
|---|---|---|---|
| Monad Testnet (10143) | [`0xF7a6e0f226ecDc708Af88679F2A9a557E918C321`](https://testnet.monadexplorer.com/address/0xF7a6e0f226ecDc708Af88679F2A9a557E918C321) | `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc` (= owner/deployer) | 2026-10-03, tx [`0xc4db6db4…`](https://testnet.monadexplorer.com/tx/0xc4db6db49374aff5c5c6a92b24aac41043ed19d92f9776749f8534affb4f6efd) |

## Última tarea realizada
Etapa 10 (demo e2e local + guion + capturas) y batería completa de pruebas (etapa 11), con hallazgos corregidos (ver "Bugs reales"). Antes: etapas 5–9.

## Próxima tarea recomendada
Validar contra redes reales (Solana devnet + Monad Testnet + wallets reales) siguiendo `DEMO.md` § "Demo con redes reales". Detalle en `NEXT_TASK.md`.

## Credenciales
- La clave del deployer/verifier (wallet MetaMask de Bernardo `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc`, solo testnet) está guardada como secreto de Devin `MONAD_DEPLOYER_PRIVATE_KEY`. **Nunca** commitearla ni ponerla en variables `NEXT_PUBLIC_*`. En Claude Code / local, usarla desde una variable de entorno o `.env` (ignorado por git).
