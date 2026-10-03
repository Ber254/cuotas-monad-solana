# Next Task

## Objetivo

Etapa 10: dejar la **demo end-to-end** ejecutable y documentada (guion en `STATUS.md` o `docs/progress/DEMO.md`): una PYME recibe USD 10.000, 10 cuotas de 1.000 USDC; se paga una cuota por Solana y el servidor la marca PAID; se completa la obligación. Y, como parte de la tarea, **cerrar la validación real de las etapas 8–9** si hay acceso a Solana devnet.

## Contexto
- Etapas 1–9 implementadas (8 y 9 probadas solo con Phantom/RPC simulados; ver `STATUS.md` y D18–D19). Contrato sin cambios; desplegado en Monad Testnet `0xF7a6e0f2…C321` (sin obligaciones).
- Hace falta acceso a: Solana devnet (`https://api.devnet.solana.com`; desde el entorno de desarrollo previo devolvía 403 por proxy), Phantom (devnet) con SOL devnet y USDC devnet (faucet.circle.com), y MetaMask con MON de testnet (faucet de Monad). Si no hay acceso, hacer todo en local (anvil + mocks) y dejar claro en la documentación qué sigue sin probarse.
- Pasos de validación real: (1) verificar el mint USDC devnet (`getAccountInfo` del mint; si difiere, corregir `DEFAULT_USDC_DEVNET_MINT` y `.env.example`); (2) crear una obligación (UI `/obligations/new`) con la `sellerSolanaAddress` = wallet Phantom del acreedor; (3) pagar la cuota 1 con Phantom; (4) verificar que `/api/payments/confirm` acepta una tx real — si el formato `jsonParsed` real difiere de las fixtures (`web/scripts/fixtures-solana.mts`), ajustar `verifyPayment.ts` y las fixtures; (5) repetir en Monad Testnet con `VERIFIER_PRIVATE_KEY` (secreto de Devin `MONAD_DEPLOYER_PRIVATE_KEY`; nunca commitear).
- Mejoras pequeñas aceptables si sobra tiempo: indicar en la UI qué acción hace cada cadena (etiquetas "Monad: registro" / "Solana: pago"), y un rate limit simple en el endpoint (D19).
- `tsconfig` target ES2017: no usar literales `1n`. Para correr foundry sin acceso a `foundryup`, ver "Entorno" en `STATUS.md`.

## Criterios de aceptación
- Guion de demo paso a paso (comandos, cuentas, qué se ve en pantalla y dónde intervienen Monad y Solana) y probado siguiendo el guion literalmente.
- Resultado real documentado: tx de Solana (firma + explorer) y tx de Monad (hash + explorer) de al menos una cuota pagada end-to-end, o la lista explícita de lo que no se pudo probar y por qué.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `forge test`, `npm run test:create`, `test:solana`, `test:verify` siguen pasando.
- Actualizar `STATUS.md`, `ROADMAP.md` (etapas 8, 9, 10) y este archivo (próxima: etapa 12, deploy en Vercel con Root Directory = `web`; etapa 11 de testing se considera cubierta por los scripts `test:*` salvo decisión contraria).
