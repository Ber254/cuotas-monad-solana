# Decisiones técnicas

Formato: número, fecha, decisión, motivo. **No cambiar una decisión sin agregar una nueva entrada que explique por qué.**

### D1 — 2026-10-03 — Monorepo simple: `contracts/` (Foundry) + `web/` (Next.js)
Sin workspaces, sin backend separado, sin base de datos. Motivo: hackathon; dos carpetas independientes que se corren con un comando cada una.

### D2 — 2026-10-03 — Monad es la fuente de verdad de obligaciones y cuotas
El contrato `InstallmentRegistry` guarda obligación, cuotas y estados. No hay DB off-chain: la web lee directo del contrato. Motivo: Monad es la cadena principal del sistema; evita sincronizar dos fuentes de verdad.

### D3 — 2026-10-03 — El contrato en Monad NO custodia fondos
Solo registra. El dinero se mueve en Solana (USDC). Motivo: el pago es en USDC sobre Solana y no queremos bridges ni escrow en el MVP.

### D4 — 2026-10-03 — Solana solo para el pago de una cuota (USDC devnet + Memo)
El comprador transfiere USDC (SPL) a la ATA de `sellerSolanaAddress` con memo `cuotas:<obligationId>:<number>`. Sin programas Solana propios (Anchor) en el MVP. Motivo: es la funcionalidad secundaria/demostrativa; una transferencia SPL + memo alcanza para identificar el pago.

### D5 — 2026-10-03 — Confirmación por "verifier" off-chain (patrón oráculo simple)
Un API route del servidor Next.js verifica la tx en Solana y llama `markInstallmentPaid` en Monad con la clave `VERIFIER_PRIVATE_KEY` (cuenta `verifier` del contrato). No hay bridge ni prueba criptográfica cross-chain. Motivo: es lo mínimo demostrable. El `paymentRef` (firma Solana) se guarda on-chain y no se puede reutilizar, así que cualquiera puede auditarlo.

### D6 — 2026-10-03 — El vendedor también puede marcar una cuota como pagada
`markInstallmentPaid` acepta `verifier` **o** `seller`. Motivo: fallback manual para la demo (si Solana devnet falla) y caso real de "el acreedor confirma que cobró". El comprador NO puede marcarse a sí mismo como pagado.

### D7 — 2026-10-03 — OVERDUE se deriva al leer, no se persiste
`status = PAID` si pagada; `OVERDUE` si impaga y `block.timestamp > dueDate`; si no `PENDING`. Motivo: evita keepers/cron. Una cuota vencida puede pagarse (sin intereses ni multas).

### D8 — 2026-10-03 — Todas las cuotas se generan y guardan al crear la obligación
Máximo 60 cuotas (acota gas). Monto igual por cuota; vencimientos `firstDueDate + (n-1)*interval`. Las cuotas pueden pagarse en cualquier orden. Motivo: el modelo pide que "se generen las cuotas"; guardarlas explícitas simplifica las lecturas de la UI.

### D9 — 2026-10-03 — Montos en unidades mínimas de USDC (6 decimales)
100 USDC = `100_000_000`. Mismo número que en Solana. Motivo: comparar el monto del pago Solana sin conversiones.

### D10 — 2026-10-03 — La obligación la crea el vendedor; el comprador no firma aceptación
Fuera del MVP: aceptación del comprador, firmas legales, KYC. Motivo: simplicidad para la demo.

### D11 — 2026-10-03 — Frontend: Next.js 15 + viem (sin wagmi por ahora)
Lecturas con `publicClient` de viem; escrituras futuras con `createWalletClient(custom(window.ethereum))`. Motivo: menos dependencias y configuración. Si la conexión de wallets se complica, evaluar wagmi y registrarlo acá.

### D12 — 2026-10-03 — Redes: Monad Testnet (chainId 10143) y Solana devnet; anvil para desarrollo local
Local se usa anvil con las cuentas por defecto (`scripts/local-chain-setup.sh`). Motivo: iterar sin faucet ni claves reales.

### D13 — 2026-10-03 — Deployer = owner = verifier en Monad Testnet
El contrato `0xF7a6e0f226ecDc708Af88679F2A9a557E918C321` (OBSOLETO desde D22; el actual está en STATUS) se desplegó con la wallet `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc`, que es también `verifier`. Motivo: una sola clave para la demo. Si el verificador pasa a ser otro servicio, usar `setVerifier` (no hace falta re-desplegar).

### D14 — 2026-10-03 — Producto renombrado a Finvia; foco en financiamiento de PYMEs
Concepto: OBLIGACIÓN → CUOTAS → FINANCIAMIENTO → PAGO → CANCELACIÓN. **No se renombra el contrato ni sus campos** (`seller`, `buyer`): en la UI se presentan como *acreedor/inversor* (`seller`, quien cobra y crea la obligación) y *deudor/PYME* (`buyer`, quien paga las cuotas). Motivo: cambiar nombres on-chain obligaría a re-desplegar y regenerar ABI sin aportar valor a la demo. La obligación demo ahora es "Capital de trabajo PYME", 10 × 1.000 USDC (USD 10.000).

### D15 — 2026-10-03 — `/obligations/[id]` es Server Component; 404 vía `ObligationNotFound`
`findObligationWithInstallments` (registry.ts) devuelve `null` si el contrato revierte con `ObligationNotFound`; la página llama `notFound()`. Otros errores (RPC caído) propagan. Se evitan literales `1n` porque `tsconfig` apunta a ES2017 (usar `BigInt(1)`).

### D16 — 2026-10-03 — Creación de obligación: validación en cliente espejo del contrato, sin wagmi
`src/lib/obligationForm.ts` (pura, testeable) replica las reglas de `InvalidParams`; `src/lib/wallet.ts` usa viem + `window.ethereum` (confirma D11, no se agregó wagmi). El monto total debe dividirse exacto entre las cuotas (cuota = total / N en unidades mínimas). Primer vencimiento se guarda a mediodía UTC para que la fecha no cambie por zona horaria. El id se lee del evento `ObligationCreated` del receipt. Constantes compartidas en `src/lib/constants.ts`. Tests con `tsx` (devDependency).

### D17 — 2026-10-03 — Wallet compartida entre componentes y simulación previa de escrituras
La cuenta EVM conectada se comparte vía `eth_accounts` al montar + evento `finvia:account` en `window` (sin Context ni wagmi). Antes de cada escritura de `markInstallmentPaid` se hace `simulateContract` para traducir errores custom del contrato (`NotAuthorized`, `AlreadyPaid`, `PaymentRefAlreadyUsed`…) a mensajes en español (`CONTRACT_ERRORS` en `wallet.ts`); un receipt fallido no trae el motivo. El botón "Marcar pagada" solo se ofrece a la wallet == `seller`, pero la autorización real es del contrato.

### D18 — 2026-10-03 — Pago Solana: tx de 3 instrucciones, Phantom directo y confirmación por polling HTTP
`src/lib/solana.ts` (pura): ATA idempotente del acreedor (la paga el deudor) + `transferChecked` (6 decimales, monto = `Installment.amount`) + Memo `cuotas:<obligationId>:<number>` con el pagador como signer. `src/lib/phantom.ts` usa `window.solana` (sin wallet-adapter, como D11) y confirma con `getSignatureStatuses` por polling, no websockets. El botón NO marca PAID (etapa 9). Se valida antes que la `sellerSolanaAddress` sea una wallet on-curve (las ATA de owners fuera de curva, es decir PDAs, se rechazan; **corrección 2026-10-05:** antes se citaba `1111…1` como ejemplo, pero esa dirección SÍ está on-curve) y que el deudor tenga saldo USDC. Mint por defecto: USDC devnet de Circle `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (**corrección 2026-10-06:** la primera versión traía una dirección con el final inventado, `…ZKqt`, que NO existe en devnet; lo detectó `real:preflight` y se corrigió con la documentación de Circle. Verificar siempre con `real:preflight`); configurable con `NEXT_PUBLIC_SOLANA_USDC_MINT`.

### D19 — 2026-10-03 — Verificador: núcleo puro inyectable + clave solo en `verifier.server.ts`
`/api/payments/confirm` delega en `confirmPayment(input, deps)` (sin Next) y `verifyPaymentTx` (puro); `src/lib/verifier.server.ts` es el único archivo que lee `VERIFIER_PRIVATE_KEY`, `SOLANA_RPC_URL`, `SOLANA_USDC_MINT` (nunca `NEXT_PUBLIC_`; no importar desde componentes cliente). Códigos: 400 parámetros, 404 obligación/cuota/tx (tx no vista → `retryable: true`), 409 ya pagada o firma reusada, 422 el pago no cumple (mint, destino, monto ≥ cuota, 6 decimales, memo exacto, tx sin error), 502 fallo de RPC/Monad. Solo se aceptan `transferChecked` de nivel superior. No se llama a Monad si algo falla antes. Si la verificación falla tras enviar el pago, la UI ofrece "Reintentar verificación" sin volver a cobrar. **Riesgo conocido:** el endpoint es público; cualquiera con una firma válida puede disparar el registro (es idempotente y correcto por diseño), pero no hay rate limit ni autenticación del llamante, y la identidad Solana del pagador no se liga con el `buyer` EVM.

### D20 — 2026-10-05 — Estrategia de pruebas sin redes reales: wallets y RPC simulados, contrastados contra el contrato
Como Solana devnet y Monad Testnet no son alcanzables desde el entorno de desarrollo, la suite (`web/e2e/`, `scripts/run-local-e2e.sh`) usa anvil real + wallets simuladas (`window.ethereum` → anvil, `window.solana` que registra lo que el cliente arma en `web/scripts/mock-solana-rpc.mts`). El mock NO está preconfigurado con la respuesta esperada: devuelve lo que el cliente envió, y el servidor lo verifica contra el contrato. Esto prueba la coherencia cliente↔servidor, no la compatibilidad con Solana real (ver riesgos en `STATUS.md`). El acreedor debe ser on-curve ya en el formulario de creación (una obligación con acreedor PDA no se podría pagar). Rate limit del endpoint: 30/min/IP en memoria (suficiente para demo; no para serverless multi-instancia).

### D21 — 2026-10-05 — Producción: verifier con wallet dedicada, runtime Node, timeouts y chequeo anti-fuga
(1) **Recomendación firme:** no usar la wallet personal owner/deployer (D13) como `VERIFIER_PRIVATE_KEY` en Vercel; crear una wallet solo-verifier y asignarla con `setVerifier` desde el owner (sin re-deploy). D13 sigue describiendo el estado actual del contrato, no la configuración recomendada de producción. (2) `/api/payments/confirm` usa `runtime = "nodejs"` y `maxDuration = 60`. (3) El cliente RPC de Monad usa timeout 8 s y 1 reintento: en serverless, fallar rápido. (4) `npm run check:deploy` (parte de `run-local-e2e.sh`) falla si un secreto llegaría al bundle del navegador; `/api/health` informa configuración sin exponer valores. (5) `app/error.tsx` muestra un error claro si Monad no responde.

### D22 — 2026-10-06 — Modelo corregido y cesión de pagarés (el "inversor" no existe)
**Corrección de D14:** no hay un inversor que entregue dinero. El modelo es de **financiamiento de proveedores**: el proveedor (`seller`, acreedor original) vende a crédito a la PYME (`buyer`, deudora), que firma N pagarés (cuotas) y los paga en USDC por Solana. Los textos de la UI/docs que decían "acreedor/inversor" o "la PYME recibe USD 10.000" eran un error de interpretación mío y se corrigieron. **Cesión (entra a la demo):** `transferInstallments` permite al acreedor de un pagaré cederlo a un tercero. Decisiones: (1) el acreedor por pagaré es *opcional* en storage (vacío = `seller`) para no encarecer la creación; (2) cada pagaré cedido lleva la cuenta Solana del nuevo acreedor y **el pago debe ir a ella**: el verificador compara el destino contra el acreedor ACTUAL leído del contrato; (3) la cesión es atómica y solo de cuotas impagas; (4) el deudor no puede ser acreedor de su propia deuda; (5) tras ceder, el acreedor anterior pierde el derecho de marcar PAID; (6) el precio de la cesión y el acuerdo comercial son off-chain (el contrato no mueve dinero). **Límites conocidos:** (a) *carrera*: si el deudor paga a la cuenta del acreedor anterior justo antes/después de la cesión, el verificador rechaza el pago (probado) y el dinero queda en la cuenta anterior: hay que resolverlo entre las partes (no hay historial de acreedores en el verificador); (b) no hay notificación/consentimiento on-chain del deudor (la UI muestra "cedido"); (c) la cesión no se revierte (el nuevo acreedor puede volver a ceder); (d) contrato sin auditar. Requiere **redesplegar** el contrato (el de Testnet `0xF7a6…C321` queda obsoleto; tenía 0 obligaciones). El despliegue se hace firmando con la wallet desde `/admin/deploy` (`NEXT_PUBLIC_ENABLE_OWNER_TOOLS=1`), sin exportar claves.

### D23 — 2026-10-07 — Sitio público bilingüe (ES/EN), sin librerías
Todo el sitio público (home, detalle, nueva obligación, "Mis pagarés", errores, mensajes del verificador) existe en español e inglés. Idioma: cookie `finvia_lang` (switch ES|EN arriba a la derecha) > `Accept-Language` (`es*` → español, el resto → inglés). Implementación: diccionarios en `web/src/lib/i18n.ts` (español = referencia; `getT()` en servidor, `useT()` en cliente), fechas/números con `es-AR` o `en-US`. Los errores que nacen en español (libs, API) se traducen al mostrarlos con `localizeMessage` (coincidencia contra el diccionario); `/api/payments/confirm` responde en el idioma de `Accept-Language` y en español si falta (scripts/`pay:devnet`). Los estados on-chain (PENDING/PAID/…) y el memo no se traducen. `/admin/*` queda en español (herramientas del owner). La E2E corre con locale `es-AR` por defecto y tiene tests en inglés. Límite: el texto libre de errores crudos de viem/RPC no se traduce.

## Fuera del MVP (no implementar sin decisión explícita)
Sistema legal, integración bancaria, KYC, scoring, marketplace, intereses/multas, cobranza, contratos complejos, auth sofisticada (solo wallets), app móvil, programas Solana propios, bridges.
