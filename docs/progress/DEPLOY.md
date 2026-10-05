# Deploy — Monad Testnet + Vercel

Estado: **preparado y verificado en local, NO desplegado** (no hay acceso a Vercel ni a Monad Testnet desde el entorno de desarrollo). El contrato ya está en Monad Testnet; falta publicar la web.

## 0. Antes de desplegar: recomendación de seguridad (leer)
La web firma `markInstallmentPaid` con `VERIFIER_PRIVATE_KEY`. Hoy el `verifier` del contrato es la wallet MetaMask personal de Bernardo (`0x316A…25dc`), que también es el `owner` (D13). **No pongas esa clave en Vercel**: quien la obtenga controla el contrato y la wallet. Usá una wallet dedicada (solo para esto, con MON de faucet) y delegá:
```bash
cast wallet new                                   # genera la wallet del verifier; guardá la clave como secreto
cast send 0xF7a6e0f226ecDc708Af88679F2A9a557E918C321 "setVerifier(address)" <NUEVA_ADDR> \
  --rpc-url https://testnet-rpc.monad.xyz --private-key $OWNER_PK     # lo firma el owner, una sola vez
cast call 0xF7a6e0f226ecDc708Af88679F2A9a557E918C321 "verifier()(address)" --rpc-url https://testnet-rpc.monad.xyz
# fondear la nueva wallet con MON (faucet de Monad Testnet) para pagar gas
```
No hace falta re-desplegar el contrato. (Ver D13/D21.) El `owner` nunca debería estar en el servidor.

## 1. Vercel
1. Importar el repo `Ber254/cuotas-monad-solana`. **Root Directory = `web`**. Framework: Next.js (autodetectado). Build/Install por defecto (`npm ci` / `next build`). Node 20 o 22.
2. Variables de entorno (Production):

| Variable | Valor | Tipo |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `10143` | pública (build) |
| `NEXT_PUBLIC_MONAD_RPC_URL` | `https://testnet-rpc.monad.xyz` | pública (build) |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | `0xF7a6e0f226ecDc708Af88679F2A9a557E918C321` | pública (build) |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC devnet (el público tiene rate limit; mejor uno propio: Helius/QuickNode/Alchemy devnet) | pública (build) |
| `NEXT_PUBLIC_SOLANA_USDC_MINT` | mint USDC devnet **verificado** (ver `DEMO.md` § B) | pública (build) |
| `VERIFIER_PRIVATE_KEY` | clave de la wallet verifier (§0) | **secreto (marcar Sensitive), NUNCA `NEXT_PUBLIC_`** |
| `SOLANA_RPC_URL` | mismo RPC devnet | secreto/servidor |
| `SOLANA_USDC_MINT` | mismo mint | servidor |

   Las `NEXT_PUBLIC_*` se **embeben al buildear**: si las cambiás, hay que redesplegar.
3. Desplegar. El endpoint de pagos declara `runtime = "nodejs"` y `maxDuration = 60` (verificar en Solana + esperar el receipt de Monad puede superar el límite por defecto; confirmar que tu plan permite 60 s).

## 2. Chequeos (todos probados en local con la configuración de Testnet)
Antes de subir, simular el build de producción:
```bash
cd web
NEXT_PUBLIC_CHAIN_ID=10143 NEXT_PUBLIC_REGISTRY_ADDRESS=0xF7a6e0f226ecDc708Af88679F2A9a557E918C321 \
VERIFIER_PRIVATE_KEY=<clave> npm run build && VERIFIER_PRIVATE_KEY=<clave> npm run check:deploy
```
`check:deploy` falla si la clave (o cualquier `NEXT_PUBLIC_*` con nombre/forma de secreto) llegaría al navegador, o si el contrato no quedó embebido. Probado con fugas simuladas.

Antes y después de desplegar, `npm run real:preflight` (en `web/`, con las mismas variables) valida mint, contrato, saldo del verifier y que la clave sea la del verifier.

Después de desplegar:
1. `GET https://<tu-app>/api/health` → debe dar **200** con `ok: true`, `verifierKeyConfigured: true`, `obligationCount` numérico. Si da 503, `problems` dice qué falta. No expone secretos.
2. Abrir `/`: debe mostrar red "Monad Testnet (chainId 10143)" y el contrato.
3. Seguir `DEMO.md` § B (corrida real de punta a punta).

Comportamiento si Monad no responde (probado): la home muestra el error de lectura; el detalle muestra la pantalla "No se pudo leer la obligación" (HTTP 500, sin trazas); `/api/payments/confirm` responde 502 limpio; los RPC fallan en ~8 s (no cuelgan la función).

## 3. Límites conocidos en producción
- **Rate limit en memoria** (30 pedidos/min/IP): en serverless cada instancia tiene el suyo → solo mitiga abuso casual. Para algo serio: Upstash/Vercel KV.
- El endpoint de confirmación es público: cualquiera con una firma de Solana válida puede disparar el registro (idempotente y verificado). La identidad Solana del pagador no se liga al deudor EVM (D19).
- Una sola clave de verifier: si se filtra, puede marcar cuotas PAID. Rotación: `setVerifier` desde el owner.
- Sin monitoreo/alertas. El detalle y la home leen del RPC en cada request (`force-dynamic`), sin caché.

## 4. Rollback
Vercel → Deployments → Promote a un deploy anterior. El estado vive en Monad, no en la web: no hay migraciones.

## 5. Alternativa sin Vercel
`cd web && npm ci && npm run build && npm run start -p 3000` en cualquier VPS con las mismas variables (el rate limit en memoria sí es global en una sola instancia).
