# Next Task

## Objetivo

Cerrar la **validación con redes y wallets reales** (etapas 8, 9 y 10) siguiendo `DEMO.md` § B, y registrar el resultado. Es lo único del MVP que sigue sin probarse; todo lo demás está cubierto por `./scripts/run-local-e2e.sh` (19/19 al 2026-10-05).

## Contexto
- Implementado y probado en local con wallets y RPC de Solana **simulados** (ver `STATUS.md` y D18–D20). Desde el entorno de desarrollo previo `api.devnet.solana.com` y `testnet-rpc.monad.xyz` no eran alcanzables (403 del proxy; reverificado 2026-10-05).
- Riesgo principal: el formato real de `getParsedTransaction(jsonParsed)` puede diferir de las fixtures (`web/scripts/fixtures-solana.mts`, escritas según la documentación) y el verificador rechazaría pagos válidos. Segundo riesgo: el mint USDC devnet `4zMMC9sr…ZKqt` no fue verificado.
- Necesitás: acceso a Solana devnet y Monad Testnet; Phantom (devnet) con SOL + USDC devnet (faucet.circle.com); MetaMask con MON de testnet; la clave del verifier (secreto de Devin `MONAD_DEPLOYER_PRIVATE_KEY`; **nunca commitear**).

## Pasos
1. Probar conectividad (`getHealth` en devnet, `eth_chainId` en Monad Testnet). Si sigue bloqueada, parar: documentar y pedir al usuario correrlo en su máquina siguiendo `DEMO.md` § B.
2. Verificar el mint USDC devnet on-chain; corregir `DEFAULT_USDC_DEVNET_MINT` / `.env.example` si hace falta.
3. Hacer una corrida real: crear obligación en Monad Testnet (MetaMask) → pagar la cuota 1 con Phantom → confirmar que `/api/payments/confirm` la marca PAID. Si responde 422 con una tx válida, comparar con las fixtures y ajustar `verifyPayment.ts` + fixtures (y mantener `npm run test:verify` verde).
4. Registrar en `STATUS.md`/`DEMO.md` la firma de Solana y el hash de Monad (con links a los explorers).
5. Si todo funciona: marcar etapas 8, 9 y 10 como ✅ en `ROADMAP.md` y pasar a la etapa 12 (deploy de `web/` en Vercel con Root Directory = `web`; `VERIFIER_PRIVATE_KEY` solo como variable de servidor; las `NEXT_PUBLIC_*` se fijan en build; ojo: el rate limit en memoria no es global entre instancias).

## Criterios de aceptación
- Una cuota pagada de punta a punta con redes reales, con evidencia (firma + hash) registrada; o la lista explícita de lo que no se pudo y por qué.
- `./scripts/run-local-e2e.sh` sigue en verde tras cualquier ajuste.
