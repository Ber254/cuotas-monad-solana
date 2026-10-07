# Pitch y demo técnica

Dos versiones del mismo producto. Riesgo principal: **el ángulo Solana es el más débil técnicamente** (no hay programa propio: transferencia USDC estándar + memo, verificada por un servidor con una sola clave). Presentar Solana como el *riel de pago*, no como la cadena de la lógica. Monad es donde está el contrato real.

## Pitch A — enfoque Solana (~3 min)
**Mensaje:** "Las PYMEs ya pagan en USDC por Solana; Finvia les añade crédito en cuotas sin cambiar cómo pagan."
1. **Problema (30 s):** el proveedor vende a crédito, cobra a 30–90 días con promesas informales y sin registro verificable.
2. **Demo (90 s):** pago de una cuota con Phantom (devnet) → la tx en el explorer de Solana con memo `cuotas:<id>:<n>` → la cuota pasa a PAID en la web.
3. **Por qué Solana (30 s):** comisiones mínimas, confirmación rápida, USDC nativo: cobrar cada cuota cuesta casi nada.
4. **Honestidad técnica (20 s):** el memo vincula pago y cuota; el verificador comprueba mint, destino, monto y memo.
5. **Cierre (10 s):** cesión de pagarés y siguiente paso.

## Pitch B — enfoque Monad (~3 min)
**Mensaje:** "Un registro on-chain verificable de cada pagaré, con cesión atómica, viable solo con transacciones rápidas y baratas."
1. **Problema (30 s):** no existe un historial confiable y compartido de quién debe qué y a quién.
2. **Demo (90 s):** crear la obligación (una tx genera todas las cuotas) → contrato en el explorer de Monad → `transferInstallments` (cesión) → cambia el acreedor.
3. **Por qué Monad (30 s):** cada cuota y cada cambio de estado es una tx; solo escala si son baratas y rápidas. Compatible con EVM: Solidity y MetaMask.
4. **Diseño del contrato (20 s):** OVERDUE se deriva al leer, cesión atómica, el deudor no puede ser acreedor.
5. **Cierre (10 s):** contrato sin auditar; siguiente paso legal y de auditoría.

## Demo técnica (~5 min, común)
1. Home → **Nueva obligación** (2 USDC, 2 cuotas) → firma en MetaMask.
2. Pagar la cuota 1 con Phantom → firma en el explorer de Solana.
3. Estado PAID en la web + hash de Monad en su explorer.
4. Ceder la cuota 2 a otra wallet.
5. `/api/health` y el selector de idioma ES | EN.

**Plan B:** grabar un video del recorrido completo antes de presentar (Phantom en navegador es lo menos probado; las testnets fallan en el peor momento).

## Preguntas difíciles
- **¿Por qué no un programa en Solana?** El MVP necesita un registro de estados, no custodia. El pago es una transferencia estándar y el contrato en Monad es la fuente de verdad; un programa propio es un paso posterior.
- **¿Y si cae el verificador?** La confirmación manual del acreedor sirve de respaldo.
- **¿Es legal un pagaré on-chain?** No está resuelto; es siguiente paso y se declara.
- **¿Una sola clave de verifier?** Sí; es un riesgo conocido (D21). Producción real requeriría multisig o verificación descentralizada.

## Datos para citar
- Contrato Monad Testnet: `0x8d7c86cb74e596f86ff69fd12a40c26330a5bf8e`
- USDC devnet (Circle): `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Repo: https://github.com/Ber254/cuotas-monad-solana · Demo: https://cuotas-monad-solana-fjez.vercel.app
- Evidencia real: pagos en Solana devnet y txs en Monad en `STATUS.md`; obligación #1 COMPLETED y una cesión hecha.
