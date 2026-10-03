# Next Task

## Objetivo

Etapa 7: en `/obligations/[id]`, que el acreedor (wallet = `obligation.seller`) pueda marcar una cuota como pagada desde la UI (`markInstallmentPaid`), como confirmación manual. Es el fallback de D6 y deja listo el flujo PAID → COMPLETED visible, antes de integrar Solana.

## Contexto
- Etapas 1–6 hechas (ver `STATUS.md`). Contrato sin cambios. Ya existe `src/lib/wallet.ts` (`connectWallet`, `ensureChain`, `errorMessage`); agregar `sendMarkInstallmentPaid(account, obligationId, number, paymentRef)` siguiendo `sendCreateObligation`.
- `/obligations/[id]` es Server Component con `force-dynamic`. Crear un Client Component pequeño (p. ej. `src/components/MarkPaidButton.tsx`) que reciba `obligationId`, `number`, `seller`, conecte la wallet, y solo muestre el botón si la cuenta conectada == `seller` y la cuota no está PAID. Tras confirmar, `router.refresh()`.
- El contrato exige `paymentRef` no vacío y único (`PaymentRefAlreadyUsed`, `AlreadyPaid`, `NotAuthorized`): pedir una referencia (input, default `manual-<obligationId>-<n>-<timestamp>`) y mostrar errores legibles.
- `tsconfig` target ES2017: no usar literales `1n`.
- NO tocar Solana (etapas 8–9); dejar claro en la UI que es confirmación manual.

## Archivos
- Crear: `web/src/components/MarkPaidButton.tsx`. Editar: `web/src/lib/wallet.ts`, `web/src/app/obligations/[id]/page.tsx` (columna de acción en la tabla).

## Criterios de aceptación
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `forge test`, `npm run test:create` pasan.
- E2E con Chromium + wallet inyectada a anvil (ver `web/scripts/e2e-create-ui.mjs`): con la cuenta del acreedor aparece el botón, marcar cuota 1 → PAID con `paymentRef`; con la cuenta de la PYME o sin wallet no aparece; pagando todas, la obligación muestra COMPLETED.
- Actualizar `STATUS.md`, `ROADMAP.md` (etapa 7) y este archivo (próxima: etapa 8, pago USDC devnet con Phantom + memo).
