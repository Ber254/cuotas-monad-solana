# Arquitectura

## Qué construimos

**Finvia**: infraestructura de financiamiento para PYMEs. Una obligación de pago se estructura en cuotas, se registra en Monad y cada cuota se paga en USDC sobre Solana. Ejemplo demo: una PYME (`buyer`, deudora) recibe USD 10.000 de un acreedor/inversor (`seller`) y los devuelve en 10 cuotas mensuales de 1.000 USDC. Ver D14 sobre la nomenclatura `seller`/`buyer` vs acreedor/deudor.

## Componentes

```
┌────────────────────────── web/ (Next.js) ──────────────────────────┐
│  UI: crear obligación · ver cuotas · botón "Pagar"                  │
│  API route (server): verificar pago Solana → markInstallmentPaid    │
└───────────────┬───────────────────────────────┬────────────────────┘
                │ viem (EVM)                     │ @solana/web3.js
                ▼                                ▼
   ┌───────────────────────────┐      ┌──────────────────────────────┐
   │ MONAD (cadena principal)  │      │ SOLANA devnet (pagos)        │
   │ contracts/ InstallmentRegistry  │ │ Transferencia USDC (SPL)     │
   │ · obligación + cuotas     │      │ comprador → vendedor         │
   │ · estados PENDING/PAID/   │      │ + Memo "cuotas:<id>:<n>"     │
   │   OVERDUE, COMPLETED      │      └──────────────────────────────┘
   └───────────────────────────┘
```

| Carpeta | Contenido |
|---|---|
| `contracts/` | Proyecto Foundry. `src/InstallmentRegistry.sol`, tests en `test/`, scripts `script/Deploy.s.sol` y `script/SeedDemo.s.sol`. |
| `web/` | Next.js 15 (App Router, TS, Tailwind 4) + viem. `src/lib/monad.ts` (chain/cliente/explorer), `src/lib/abi.ts` (ABI generado), `src/lib/registry.ts` (lecturas tipadas + `findObligationWithInstallments`), `src/lib/format.ts` (USDC/fechas es-AR), `src/components/StatusBadge.tsx`. Páginas: `/` (listado), `/obligations/[id]` (detalle + cuotas) y `/obligations/new` (formulario + wallet; `src/lib/obligationForm.ts` validación pura, `src/lib/wallet.ts` conexión/escritura). |
| `scripts/` | `export-abi.sh`: compila el contrato y regenera `web/src/lib/abi.ts`. |
| `docs/progress/` | Documentación de continuidad. |

## Monad (fuente de verdad de la obligación)

Contrato `InstallmentRegistry` (Solidity 0.8.28). **No custodia fondos.**

### Modelo de datos

`Obligation`
| campo | tipo | nota |
|---|---|---|
| id | uint256 | autoincremental desde 1 |
| description | string | ej. "Celular" |
| seller | address | quien crea la obligación (`msg.sender`) |
| buyer | address | comprador (EVM) |
| sellerSolanaAddress | string | pubkey base58 que recibe los USDC en Solana |
| installmentAmount | uint256 | unidades mínimas USDC (6 decimales): 100 USDC = `100_000_000` |
| installmentCount | uint8 | 1..60 |
| paidCount | uint8 | cuotas pagadas |
| firstDueDate | uint64 | unix seconds |
| interval | uint64 | segundos entre vencimientos (mensual = 30 días = 2_592_000) |
| createdAt | uint64 | |
| status | enum | `ACTIVE` (0) / `COMPLETED` (1) |

`Installment` (se generan todas al crear la obligación)
| campo | tipo | nota |
|---|---|---|
| obligationId | uint256 | referencia a la obligación |
| number | uint8 | 1..N |
| amount | uint256 | = installmentAmount |
| dueDate | uint64 | `firstDueDate + (number-1) * interval` |
| paid / paidAt | bool / uint64 | |
| paymentRef | string | firma de la tx Solana (o comprobante manual) |

La vista `InstallmentView` (lo que devuelven `getInstallment`/`getInstallments`) agrega `status`, `buyer` y `seller`.

### Estados

- Cuota: `PENDING` (0) → `PAID` (1). `OVERDUE` (2) **no se guarda**: se deriva al leer si `!paid && block.timestamp > dueDate`. Una cuota OVERDUE se puede pagar y pasa a PAID.
- Obligación: `ACTIVE` → `COMPLETED` automáticamente cuando `paidCount == installmentCount`.

### Funciones

| función | quién | efecto |
|---|---|---|
| `createObligation(description, buyer, sellerSolanaAddress, installmentAmount, installmentCount, firstDueDate, interval)` | vendedor | crea obligación + N cuotas, emite `ObligationCreated` |
| `markInstallmentPaid(obligationId, number, paymentRef)` | `verifier` o el vendedor | marca PAID, rechaza doble pago y `paymentRef` repetido, emite `InstallmentPaid` y `ObligationCompleted` |
| `getObligation`, `getInstallment`, `getInstallments`, `getObligationsByBuyer`, `getObligationsBySeller`, `obligationCount` | cualquiera | lecturas |
| `setVerifier(addr)` | owner (deployer) | cambia el verificador |

## Solana (pago demostrativo) — todavía no implementado

Flujo previsto (etapas 7–9 del ROADMAP):

1. El comprador presiona "Pagar" en una cuota; la web arma una transferencia **USDC devnet** (SPL token) desde la wallet del comprador (Phantom) hacia la ATA de `sellerSolanaAddress`, con una instrucción **Memo** `cuotas:<obligationId>:<number>`.
2. La web envía la firma de la tx a un API route del servidor (`/api/payments/confirm`).
3. El servidor (el **verifier**) consulta la tx en Solana devnet y verifica: confirmada, mint = USDC devnet, destino = ATA del vendedor, monto ≥ `amount` de la cuota, memo coincide.
4. Si es válida, el servidor firma `markInstallmentPaid(obligationId, number, signature)` en Monad con la clave del verifier (`VERIFIER_PRIVATE_KEY`, solo server-side).

## Redes

| | Monad | Solana |
|---|---|---|
| Demo | Monad Testnet, chainId `10143`, RPC `https://testnet-rpc.monad.xyz`, explorer `https://testnet.monadexplorer.com` | devnet, RPC `https://api.devnet.solana.com` |
| Local | anvil (`31337`, `http://127.0.0.1:8545`) | — |

## Variables de entorno (web)

Ver `web/.env.example`. Públicas: `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_MONAD_RPC_URL`, `NEXT_PUBLIC_REGISTRY_ADDRESS`. Futuras (server-side, nunca `NEXT_PUBLIC_`): `VERIFIER_PRIVATE_KEY`, `SOLANA_RPC_URL`, `SOLANA_USDC_MINT`.

> Ojo: Next.js inyecta las `NEXT_PUBLIC_*` en **build time**. Si cambian, hay que volver a hacer `npm run build`.
