# Guion de demo — Finvia

Mensaje de 20 segundos: *"Una PYME necesita USD 10.000. Se registra la obligación y sus 10 cuotas en **Monad** (estado verificable). Cada cuota se paga en **USDC sobre Solana**; el servidor verifica el pago y recién entonces la cuota pasa a PAID en Monad. Cuando están las 10, la obligación queda COMPLETED."*

## A. Demo local (verificada: `./scripts/run-local-e2e.sh`, caso "obligación #1 → 10 cuotas pagadas por Solana → COMPLETED")
Capturas generadas por esa corrida en `docs/progress/demo/`: `01-home`, `02-detalle-pendiente`, `03-cuota-1-pagada`, `04-completada`, `05-nueva-obligacion`, `06-cuota-vencida`, `mobile-detail`.

Para recorrerla a mano (con wallets reales o con las simuladas del E2E):
```bash
anvil                                              # terminal 1
./scripts/local-chain-setup.sh                     # terminal 2: deploy + obligación #1 (10 × 1.000 USDC)
npx tsx web/scripts/mock-solana-rpc.mts            # terminal 3: solo si NO tenés Solana devnet
cd web && npm run build && \
  VERIFIER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  SOLANA_RPC_URL=http://127.0.0.1:8899 npm run start -- -p 3100   # clave pública de anvil (cuenta 0 = verifier)
```
1. **Home** (`/`): obligaciones registradas y link a cada una. *Monad:* el listado sale del contrato.
2. **Detalle #1**: deudor (PYME), acreedor, cuenta de cobro Solana, 10.000 USDC, 10 cuotas PENDING con vencimientos. Panel superior: qué hace Monad y qué hace Solana.
3. **Crear otra** (`/obligations/new`, wallet del acreedor = anvil 0): monto 3.000, 6 cuotas → vista previa de vencimientos → crear → redirige al detalle. *Monad:* tx `createObligation`.
4. **Pagar cuota 1**: "Pagar con Solana" (Phantom) → transferencia USDC + memo `cuotas:1:1` → el servidor verifica (mint, destino, monto, memo) → la cuota pasa a PAID con la firma de Solana como referencia (link al explorer). *Solana:* el pago. *Monad:* `markInstallmentPaid` firmado por el verifier.
5. Repetir hasta la 10: progreso 10/10, saldo 0, estado **COMPLETED**.
6. **Respaldo manual**: con la wallet del acreedor, "Marcar pagada" con una referencia (si Solana fallara en vivo).
7. **Vencida**: una cuota impaga pasada de fecha se muestra OVERDUE (derivado del tiempo); igual se puede pagar.

Qué decir si preguntan "¿es seguro?": el contrato no custodia fondos; solo el verifier (o el acreedor) puede marcar PAID; una firma de Solana no se puede reutilizar (el contrato la rechaza); el pago debe coincidir en mint, destino, monto y memo. Límites conocidos: ver `STATUS.md` ("Sin probar / riesgos").

## B. Demo con redes reales (PENDIENTE — no se pudo probar; hacerlo antes de presentar)
Requisitos: Phantom en devnet con SOL y USDC devnet (faucet.circle.com), MetaMask con MON de Monad Testnet, acceso a `api.devnet.solana.com` y `testnet-rpc.monad.xyz`.

**Herramientas (probadas contra la pila local; falta correrlas contra las redes reales):**
```bash
cd web   # con NEXT_PUBLIC_CHAIN_ID=10143, NEXT_PUBLIC_REGISTRY_ADDRESS=0xF7a6…C321, SOLANA_RPC_URL, SOLANA_USDC_MINT, VERIFIER_PRIVATE_KEY exportadas
npm run real:preflight                                   # conectividad, mint USDC (decimales, owner), contrato, saldo del verifier,
                                                         # y que VERIFIER_PRIVATE_KEY sea realmente el verifier (si no: NotAuthorized)
npm run pay:devnet -- --keypair ~/.config/solana/id.json --obligation <id> --number <n> --confirm https://<app>
                                                         # paga una cuota por CLI (misma tx que la UI) y llama al verificador
npm run solana:new -- --out .solana-payer.json           # wallet Solana pagadora (la clave no se imprime; fondearla con SOL y USDC devnet)
npm run real:tx -- <firmaSolana> <obligationId> <cuota>  # contrasta una tx real con la obligación y muestra qué ve el verificador
```
1. `npm run real:preflight` debe terminar en ✓. Confirmar a mano que el mint es el USDC de devnet de Circle; si no, cambiar `SOLANA_USDC_MINT` y `NEXT_PUBLIC_SOLANA_USDC_MINT`.
2. `web/.env.local`: `NEXT_PUBLIC_CHAIN_ID=10143`, `NEXT_PUBLIC_REGISTRY_ADDRESS=0xF7a6e0f226ecDc708Af88679F2A9a557E918C321`, `VERIFIER_PRIVATE_KEY` de la wallet verifier **dedicada** (`DEPLOY.md` § 0), `SOLANA_RPC_URL`.
3. Crear la obligación desde `/obligations/new` con MetaMask (el acreedor no puede ser el deudor); `sellerSolanaAddress` = pubkey de la wallet Phantom del acreedor (una wallet normal, no una PDA).
4. Pagar la cuota 1 con Phantom (la pagadora necesita USDC devnet) **o** con `pay:devnet`. Si `/api/payments/confirm` responde 422 con una tx válida: `real:tx` muestra lo que devolvió Solana y por qué se rechazó; ajustar `verifyPayment.ts` y `fixtures-solana.mts`.
5. Registrar acá la firma de Solana y el hash de Monad de la cuota pagada.
