# Next Task

## Objetivo

**Paso previo (nuevo, 2026-10-06): redesplegar el contrato en Monad Testnet.** El de `0xF7a6…C321` es la versión SIN cesión de pagarés (0 obligaciones, no se pierde nada). Con `NEXT_PUBLIC_ENABLE_OWNER_TOOLS=1 npm run dev` (y `NEXT_PUBLIC_CHAIN_ID=10143`) abrir `http://localhost:3000/admin/deploy`, conectar la wallet owner (MetaMask), pegar como verifier la wallet dedicada (`0x71fE6cD7c2aD770584fc7fCc763adF36e884cA70`) y "Desplegar contrato" (firma MetaMask, sin exportar claves). Después: actualizar `NEXT_PUBLIC_REGISTRY_ADDRESS` (variables de la terminal, `web/.env.example`, tabla de "Direcciones desplegadas" de STATUS, DEPLOY, DEMO) y correr `npm run real:preflight` (debe mostrar owner = wallet personal y verifier = `0x71fE…`).

Luego: desplegar la web (Vercel) y hacer **la corrida real de punta a punta** con Solana devnet, Monad Testnet y wallets reales. Es lo único del MVP sin probar; todo lo demás está cubierto por `./scripts/run-local-e2e.sh` (20/20 al 2026-10-05). **Requiere acciones que solo puede hacer una persona con acceso** (Vercel, wallets, faucets, redes no bloqueadas): si el agente no tiene ese acceso, debe preparar lo que falte y pedirle al usuario que ejecute los pasos de `DEPLOY.md` y `DEMO.md` § B, sin marcar nada como ✅.

## Contexto
- Etapas 1–11 hechas; la 12 está **preparada** (`DEPLOY.md`, `/api/health`, `check:deploy`) pero no desplegada. Etapas 8, 9 y 10 probadas solo con wallets y RPC de Solana simulados (D20).
- Riesgos principales a validar primero: (a) el formato real de `getParsedTransaction(jsonParsed)` vs. las fixtures (`web/scripts/fixtures-solana.mts`): si el verificador devuelve 422 con una tx válida, ajustar `verifyPayment.ts`; (b) el mint USDC devnet `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (corregido el 2026-10-06; confirmar con `real:preflight`); (c) latencia: el endpoint puede superar 10 s (`maxDuration = 60`).
- Seguridad: **no usar la clave personal del owner/deployer como verifier en Vercel** (D21, `DEPLOY.md` § 0): crear una wallet dedicada y llamar `setVerifier`.

## Desbloqueo (lo único que depende de una persona)
- **Red del entorno del agente:** Solana devnet, Monad Testnet y Vercel están bloqueados por la política de red del entorno cloud (HTTP 403 del proxy; verificado 2026-10-05). Para que un agente los alcance: en el entorno de la sesión (menú del entorno en la barra de título → Edit → *Network access*) elegir **Custom** y agregar en *Allowed domains* `api.devnet.solana.com`, `testnet-rpc.monad.xyz` (y `api.vercel.com` solo si se quiere que el agente use la CLI de Vercel, con un token que vos le des como secreto del entorno), manteniendo la lista de gestores de paquetes. Pasos: https://code.claude.com/docs/en/cloud-environments#network-access. Alternativa: correr los pasos tú en tu máquina.
- **Cosas que ningún agente puede hacer solo:** conseguir USDC devnet (faucet.circle.com requiere navegador), fondear con MON (faucet de Monad), aprobar firmas en MetaMask/Phantom, y crear/aprobar el proyecto en Vercel. Con red permitida, un agente sí puede correr `real:preflight`, crear la obligación con `cast` (con una clave testnet que se le provea) y pagar con `pay:devnet` (con un keypair devnet fondeado), saltándose los navegadores.

## Pasos
-1. (Nuevo) Redesplegar el contrato como se describe arriba; probar la cesión con wallets reales: el proveedor cede pagarés a una segunda wallet (`/obligations/<id>`, panel "Ceder pagarés"), el deudor paga uno al acreedor nuevo y comprobar que el verificador lo acepta. Ver `DEMO.md`.
0. `cd web && npm run real:preflight` (ver `DEMO.md` § B): debe terminar en ✓ antes de seguir. Para pagar por CLI: `npm run pay:devnet -- --keypair … --obligation … --number … --confirm https://<app>`; para diagnosticar un 422: `npm run real:tx -- <firma> <obligationId> <cuota>`.
1. Wallet verifier dedicada + `setVerifier` + fondearla con MON (`DEPLOY.md` § 0).
2. Verificar el mint USDC devnet (`getAccountInfo`) y corregir `DEFAULT_USDC_DEVNET_MINT` / `.env.example` si difiere.
3. Probar el build de producción con la configuración de Testnet: `npm run build && npm run check:deploy` (con `VERIFIER_PRIVATE_KEY` definida) y `GET /api/health` (debe dar 200).
4. Desplegar en Vercel (Root Directory = `web`, variables de `DEPLOY.md` § 1) y repetir `/api/health` sobre la URL pública.
5. `DEMO.md` § B: crear una obligación con MetaMask, pagar la cuota 1 con Phantom, confirmar PAID. Registrar firma de Solana + hash de Monad + URL de la app en `STATUS.md`/`DEMO.md`.
6. Si todo funciona: marcar etapas 8, 9, 10 y 12 como ✅ en `ROADMAP.md`. Si algo falla, documentarlo y corregir (manteniendo `run-local-e2e.sh` verde).

## Criterios de aceptación
- URL pública con `/api/health` 200 y una cuota pagada de punta a punta con redes reales (evidencia registrada), o la lista explícita de lo que no se pudo y por qué.
- `./scripts/run-local-e2e.sh` en verde tras cualquier ajuste.
