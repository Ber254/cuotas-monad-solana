# Next Task

## Objetivo

Desplegar la web (Vercel) y hacer **la corrida real de punta a punta** con Solana devnet, Monad Testnet y wallets reales. Es lo único del MVP sin probar; todo lo demás está cubierto por `./scripts/run-local-e2e.sh` (20/20 al 2026-10-05). **Requiere acciones que solo puede hacer una persona con acceso** (Vercel, wallets, faucets, redes no bloqueadas): si el agente no tiene ese acceso, debe preparar lo que falte y pedirle al usuario que ejecute los pasos de `DEPLOY.md` y `DEMO.md` § B, sin marcar nada como ✅.

## Contexto
- Etapas 1–11 hechas; la 12 está **preparada** (`DEPLOY.md`, `/api/health`, `check:deploy`) pero no desplegada. Etapas 8, 9 y 10 probadas solo con wallets y RPC de Solana simulados (D20).
- Riesgos principales a validar primero: (a) el formato real de `getParsedTransaction(jsonParsed)` vs. las fixtures (`web/scripts/fixtures-solana.mts`): si el verificador devuelve 422 con una tx válida, ajustar `verifyPayment.ts`; (b) el mint USDC devnet `4zMMC9sr…ZKqt` sin verificar; (c) latencia: el endpoint puede superar 10 s (`maxDuration = 60`).
- Seguridad: **no usar la clave personal del owner/deployer como verifier en Vercel** (D21, `DEPLOY.md` § 0): crear una wallet dedicada y llamar `setVerifier`.

## Pasos
1. Wallet verifier dedicada + `setVerifier` + fondearla con MON (`DEPLOY.md` § 0).
2. Verificar el mint USDC devnet (`getAccountInfo`) y corregir `DEFAULT_USDC_DEVNET_MINT` / `.env.example` si difiere.
3. Probar el build de producción con la configuración de Testnet: `npm run build && npm run check:deploy` (con `VERIFIER_PRIVATE_KEY` definida) y `GET /api/health` (debe dar 200).
4. Desplegar en Vercel (Root Directory = `web`, variables de `DEPLOY.md` § 1) y repetir `/api/health` sobre la URL pública.
5. `DEMO.md` § B: crear una obligación con MetaMask, pagar la cuota 1 con Phantom, confirmar PAID. Registrar firma de Solana + hash de Monad + URL de la app en `STATUS.md`/`DEMO.md`.
6. Si todo funciona: marcar etapas 8, 9, 10 y 12 como ✅ en `ROADMAP.md`. Si algo falla, documentarlo y corregir (manteniendo `run-local-e2e.sh` verde).

## Criterios de aceptación
- URL pública con `/api/health` 200 y una cuota pagada de punta a punta con redes reales (evidencia registrada), o la lista explícita de lo que no se pudo y por qué.
- `./scripts/run-local-e2e.sh` en verde tras cualquier ajuste.
