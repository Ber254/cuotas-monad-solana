# Next Task

## Objetivo

Etapa 9: endpoint `POST /api/payments/confirm` que verifica en Solana el pago de una cuota y, si es válido, llama `markInstallmentPaid` en Monad con la clave del verifier. Conectarlo al `PayWithSolanaButton` (tras enviar la tx, llamar al endpoint con la firma y refrescar la página).

## Contexto
- Etapas 1–8 hechas (8 parcial: sin tx real en devnet, ver `STATUS.md`). Diseño en `ARCHITECTURE.md` (sección Solana, pasos 2–4) y D5, D18.
- Body: `{ obligationId, number, signature }`. El servidor lee la obligación/cuota de Monad (`getObligation`, `getInstallments`), obtiene la tx con `Connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })` y verifica TODO: tx existe y no falló; contiene una instrucción spl-token `transferChecked` con mint = `usdcMint`, destino = ATA(mint, `sellerSolanaAddress`), monto ≥ `amount` de la cuota y decimales 6; contiene Memo exacto `cuotas:<obligationId>:<number>`; la cuota existe y no está PAID. Si todo ok: `walletClient` con `VERIFIER_PRIVATE_KEY` (server-only, NUNCA `NEXT_PUBLIC_`) → `markInstallmentPaid(id, number, signature)`. Mapear errores (`AlreadyPaid`, `PaymentRefAlreadyUsed`) a 409.
- Separar la verificación en una función pura `verifyPaymentTx(parsedTx, expected)` en `web/src/lib/verifyPayment.ts` para testearla offline con tx parseadas de fixture (casos: ok, mint incorrecto, destino incorrecto, monto menor, memo incorrecto, tx fallida).
- Variables nuevas (server): `VERIFIER_PRIVATE_KEY`, `SOLANA_RPC_URL`, `SOLANA_USDC_MINT` en `web/.env.example` (sin valores reales). Para anvil local, la cuenta 0 es el verifier (clave pública de anvil).
- `tsconfig` target ES2017: no usar literales `1n`. Para correr la web contra anvil: `forge`/`anvil` por npm y `FOUNDRY_SOLC` como en `STATUS.md`.
- Si hay acceso a devnet: probar de punta a punta (pagar con Phantom → confirm → PAID) y, de paso, cerrar la etapa 8. Si NO hay acceso: usar un RPC mock en el test del endpoint y documentar claramente que no se probó contra Solana real.

## Archivos
- Crear: `web/src/lib/verifyPayment.ts`, `web/src/app/api/payments/confirm/route.ts`, `web/scripts/test-verify-payment.mts`. Editar: `web/src/components/PayWithSolanaButton.tsx`, `web/.env.example`, `web/package.json`.

## Criterios de aceptación
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `forge test`, `npm run test:create`, `npm run test:solana` y el nuevo test del verificador pasan.
- Endpoint probado contra anvil con RPC Solana simulado: tx válida → cuota PAID con `paymentRef` = firma; reintentar → 409; datos incorrectos → 422 sin tocar la cadena.
- Actualizar `STATUS.md`, `ROADMAP.md` (etapas 8 y 9) y este archivo (próxima: etapa 10, guion de demo end-to-end).
