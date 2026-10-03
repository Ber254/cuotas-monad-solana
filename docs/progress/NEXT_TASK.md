# Next Task

## Objetivo

Etapa 8: botón "Pagar con Solana" por cuota que arma y envía desde Phantom una transferencia **USDC devnet (SPL)** del deudor a la ATA de `sellerSolanaAddress`, con una instrucción **Memo** `cuotas:<obligationId>:<number>`, y muestra la firma + link al explorer de Solana devnet. **No** marca la cuota como PAID todavía (eso es la etapa 9, verificación server-side).

## Contexto
- Etapas 1–7 hechas (ver `STATUS.md`). Solana es SOLO el riel de pago (D4, D5); sin programas propios ni bridges.
- Datos de cada cuota: `amount` (unidades mínimas USDC, 6 decimales = mismas unidades que el SPL token), `obligationId`, `number`, y `obligation.sellerSolanaAddress` (destino).
- Dependencias a agregar en `web/`: `@solana/web3.js`, `@solana/spl-token`. Wallet: `window.solana` / Phantom (provider inyectado: `connect`, `signAndSendTransaction`). Sin wallet-adapter para no inflar el bundle (misma filosofía que D11).
- USDC devnet mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZ6hZKqt` (verificar antes de usar) — dejarlo en `NEXT_PUBLIC_SOLANA_USDC_MINT` y `NEXT_PUBLIC_SOLANA_RPC_URL` (default `https://api.devnet.solana.com`), documentar en `web/.env.example`.
- Pasos de la tx: crear ATA del vendedor si no existe (`createAssociatedTokenAccountIdempotentInstruction`), `createTransferCheckedInstruction` (decimales 6), instrucción Memo (programa `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`). Mostrar errores legibles (sin saldo de USDC, wallet no instalada, rechazo).
- Solo el deudor (EVM `buyer`) debería ver el botón... pero su identidad Solana no está ligada on-chain: mostrar el botón a cualquiera con wallet Phantom, aclarar en la UI que la verificación real es server-side (etapa 9).
- `tsconfig` target ES2017: no usar literales `1n`.

## Archivos
- Crear: `web/src/lib/solana.ts` (construcción de la tx, pura/testeable), `web/src/components/PayWithSolanaButton.tsx`. Editar: `web/src/app/obligations/[id]/page.tsx`, `web/.env.example`, `web/package.json`.

## Criterios de aceptación
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `forge test`, `npm run test:create` pasan.
- Test (tsx, sin Phantom): `solana.ts` construye la tx con 3 instrucciones esperadas (ATA idempotente, transferChecked con el monto exacto, memo `cuotas:<id>:<n>`); y si hay acceso a devnet, una tx real firmada con una keypair de prueba (faucet de USDC devnet / SOL) visible en el explorer con el memo. Si devnet no es alcanzable desde el entorno o no hay USDC devnet, **documentarlo explícitamente** y no marcar la etapa 8 como ✅ de punta a punta.
- Actualizar `STATUS.md`, `ROADMAP.md` (etapa 8) y este archivo (próxima: etapa 9, `/api/payments/confirm`).
