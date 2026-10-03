# Next Task

## Objetivo

Etapa 6: crear una obligación desde la UI. Página `/obligations/new` con formulario y wallet EVM (MetaMask) que llame a `createObligation` en Monad y redirija a `/obligations/<id>`.

## Contexto

- Etapas 1–5 hechas (ver `STATUS.md`). El contrato no cambia. La web solo lee; falta la primera escritura.
- Decisión D11: viem sin wagmi; escritura con `createWalletClient({ chain, transport: custom(window.ethereum) })`. Si se complica, evaluar wagmi y registrarlo en `DECISIONS.md`.
- D14: en la UI el `seller` (quien firma la tx) es el acreedor/inversor y el `buyer` es la PYME deudora.
- Montos en unidades mínimas USDC (`parseUnits(x, USDC_DECIMALS)`); `installmentCount` 1..60; `firstDueDate` e `interval` en unix seconds (default: primer vencimiento en 30 días, intervalo 30 días = 2_592_000). Ojo: `tsconfig` target ES2017 → no usar literales `1n`, usar `BigInt(1)`.
- El contrato revierte con `InvalidParams` si buyer = 0x0 o = msg.sender, monto 0, cuotas 0 o >60, `firstDueDate` 0, `interval` 0 con >1 cuota, o `sellerSolanaAddress` vacía. Validar lo mismo en el cliente.

## Archivos
- Crear: `web/src/app/obligations/new/page.tsx` (Client Component), opcional `web/src/lib/wallet.ts`.
- Editar: `web/src/app/page.tsx` (link "Nueva obligación"), `web/src/lib/registry.ts` si hace falta un helper de escritura.

## Qué implementar
1. Botón "Conectar wallet" (`eth_requestAccounts`); si la red no coincide con `chain`, pedir `wallet_switchEthereumChain` / `wallet_addEthereumChain`.
2. Campos: descripción, dirección EVM de la PYME deudora, cuenta Solana del acreedor (base58, 32–44 chars), monto total en USDC y cantidad de cuotas (la cuota = total / cuotas; rechazar si no divide exacto), fecha del primer vencimiento, intervalo en días. Mostrar vista previa de las cuotas (N° y fecha) antes de enviar.
3. Enviar `createObligation`, esperar el receipt (`waitForTransactionReceipt`), leer `obligationCount` o el evento `ObligationCreated` para obtener el id, y redirigir a `/obligations/<id>`. Mostrar errores legibles.
4. NO agregar botón de pago (etapas 7–9).

## Criterios de aceptación
- `npm run lint`, `npx tsc --noEmit`, `npm run build` pasan; `forge test` sigue pasando.
- Con anvil + `local-chain-setup.sh` y un navegador con wallet apuntando a anvil (cuenta 0 importada), crear una obligación y verla en su página con N filas PENDING. Si no hay navegador con wallet disponible, probar al menos la lógica pura (validación, cálculo de cuotas, `parseUnits`) y la tx con un script viem contra anvil, y **documentar que el flujo MetaMask no se probó**.
- Actualizar `STATUS.md`, `ROADMAP.md` (etapa 6) y este archivo (próxima: etapa 7, pago manual por el acreedor desde la UI).
