# Next Task

## Objetivo

Crear la página de detalle de una obligación `/obligations/[id]` que muestre la obligación y la tabla de sus cuotas leídas del contrato `InstallmentRegistry` en Monad (etapa 5 del ROADMAP). Solo lectura.

## Contexto

- El contrato ya existe y está testeado: `contracts/src/InstallmentRegistry.sol`.
- La web ya lee del contrato: `web/src/lib/registry.ts` exporta `getObligation(id)` y `getInstallments(id)`, que devuelven los structs con `status` ya convertido a string (`"PENDING" | "PAID" | "OVERDUE"` y `"ACTIVE" | "COMPLETED"`).
- `web/src/app/page.tsx` es un Server Component que lee `obligationCount` — usar el mismo patrón (Server Component, `export const dynamic = "force-dynamic"`).
- Para desarrollar localmente hay una obligación demo (#1: "Celular", 10 cuotas de 100 USDC, mensual) que crea `scripts/local-chain-setup.sh` en anvil.
- Montos en unidades mínimas USDC (6 decimales): usar `formatUnits(amount, USDC_DECIMALS)` de viem.
- Decisiones relevantes: D2, D7, D9 en `DECISIONS.md`.

## Archivos relevantes

- `web/src/lib/registry.ts` (lecturas; agregar helpers si hace falta)
- `web/src/lib/monad.ts` (chain, `registryAddress`, explorer)
- `web/src/app/page.tsx` (home; agregar link/listado a las obligaciones)
- Crear: `web/src/app/obligations/[id]/page.tsx`

## Qué implementar

1. `web/src/app/obligations/[id]/page.tsx` (Server Component):
   - Parsear `id` (Next 15: `params` es una Promise → `const { id } = await params`). Si no es entero positivo o el contrato revierte con `ObligationNotFound`, llamar `notFound()`.
   - Encabezado: descripción, estado de la obligación (ACTIVE/COMPLETED), vendedor, comprador, `sellerSolanaAddress`, monto por cuota en USDC, progreso `paidCount / installmentCount`.
   - Tabla de cuotas con columnas: N°, monto (USDC), vencimiento (fecha legible `es-AR`, desde `dueDate` unix seconds), estado (badge con color: PENDING gris, PAID verde, OVERDUE rojo), `paymentRef` (o "—").
   - Agregar `data-testid="installment-row"` en cada fila y `data-testid="installment-status"` en el badge para poder testear con curl/Playwright.
2. En la home (`page.tsx`): listar links `Obligación #1 … #N` hacia `/obligations/<n>` usando `obligationCount`.
3. NO agregar wallets, formularios ni botones de pago (son etapas 6–8).

## Criterios de aceptación

- `npm run lint`, `npx tsc --noEmit` y `npm run build` en `web/` pasan.
- `forge test` en `contracts/` sigue pasando (no se debería tocar el contrato).
- Con anvil + `scripts/local-chain-setup.sh`, `/obligations/1` muestra 10 filas, todas `PENDING`, monto `100` USDC, vencimientos separados 30 días.
- Después de `cast send <REGISTRY> "markInstallmentPaid(uint256,uint8,string)" 1 1 demo-sig-1 --private-key <PK cuenta 0 de anvil> --rpc-url http://127.0.0.1:8545`, la cuota 1 muestra `PAID` y `paymentRef = demo-sig-1`.
- `/obligations/999` y `/obligations/abc` devuelven 404.
- `STATUS.md`, `ROADMAP.md` (etapa 5 ✅) y este `NEXT_TASK.md` actualizados (próxima: etapa 6, creación de obligación desde la UI).

## Cómo probar

```bash
# terminal 1
anvil
# terminal 2 (raíz del repo)
./scripts/local-chain-setup.sh          # despliega, crea obligación #1 y escribe web/.env.local
cd web && npm install && npm run dev
curl -s localhost:3000/obligations/1 | grep -o 'data-testid="installment-status"[^<]*<' | head
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/obligations/999   # 404
```
