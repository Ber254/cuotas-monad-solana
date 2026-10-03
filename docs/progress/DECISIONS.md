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
El contrato `0xF7a6e0f226ecDc708Af88679F2A9a557E918C321` se desplegó con la wallet `0x316A886C4948Ba8Caf10bae25d37Febf42e525dc`, que es también `verifier`. Motivo: una sola clave para la demo. Si el verificador pasa a ser otro servicio, usar `setVerifier` (no hace falta re-desplegar).

### D14 — 2026-10-03 — Producto renombrado a Finvia; foco en financiamiento de PYMEs
Concepto: OBLIGACIÓN → CUOTAS → FINANCIAMIENTO → PAGO → CANCELACIÓN. **No se renombra el contrato ni sus campos** (`seller`, `buyer`): en la UI se presentan como *acreedor/inversor* (`seller`, quien cobra y crea la obligación) y *deudor/PYME* (`buyer`, quien paga las cuotas). Motivo: cambiar nombres on-chain obligaría a re-desplegar y regenerar ABI sin aportar valor a la demo. La obligación demo ahora es "Capital de trabajo PYME", 10 × 1.000 USDC (USD 10.000).

### D15 — 2026-10-03 — `/obligations/[id]` es Server Component; 404 vía `ObligationNotFound`
`findObligationWithInstallments` (registry.ts) devuelve `null` si el contrato revierte con `ObligationNotFound`; la página llama `notFound()`. Otros errores (RPC caído) propagan. Se evitan literales `1n` porque `tsconfig` apunta a ES2017 (usar `BigInt(1)`).

## Fuera del MVP (no implementar sin decisión explícita)
Sistema legal, integración bancaria, KYC, scoring, marketplace, intereses/multas, cobranza, contratos complejos, auth sofisticada (solo wallets), app móvil, programas Solana propios, bridges.
