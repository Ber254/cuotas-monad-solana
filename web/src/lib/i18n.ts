/**
 * Internacionalización mínima (sin librerías): diccionarios es/en, detección de idioma y traducción con parámetros.
 * Los textos en español son la referencia (los tests E2E corren con locale es-AR). Admin (/admin/*) queda en español.
 */
export type Lang = "es" | "en";
export const LANG_COOKIE = "finvia_lang";

/** Cookie explícita > Accept-Language (es* → español) > inglés. */
export function detectLang(cookie?: string | null, acceptLanguage?: string | null): Lang {
  if (cookie === "es" || cookie === "en") return cookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("es") ? "es" : "en";
}

const es = {
  "app.title": "Finvia — financiamiento PYME en cuotas",
  "app.description": "Financiamiento de proveedores para PYMEs: pagarés en cuotas registrados en Monad, pago en USDC sobre Solana.",
  "nav.back": "← Volver",
  "common.connectWallet": "Conectar wallet",
  "common.changeAccount": "Cambiar cuenta",
  "common.waiting": "Esperando confirmación…",

  "home.intro":
    "Financiamiento de proveedores para PYMEs: el proveedor vende a crédito y la PYME firma pagarés (cuotas) registrados en <b>Monad</b> (fuente de verdad verificable). Cada pagaré se paga en <b>USDC sobre Solana</b> y el proveedor puede <b>ceder</b> pagarés a un tercero.",
  "home.network": "Red",
  "home.contract": "Contrato",
  "home.count": "Obligaciones registradas",
  "home.notConfigured": "contrato no configurado",
  "home.readError": "error leyendo el contrato",
  "home.obligations": "Obligaciones",
  "home.new": "+ Nueva obligación",
  "home.empty": "Todavía no hay obligaciones.",
  "home.item": "Obligación #{id} — {desc}",
  "home.footer": "MVP de hackathon. Estado y próxima tarea en <code>docs/progress/</code>.",

  "my.title": "Mis pagarés",
  "my.reading": "Leyendo desde Monad…",
  "my.empty": "Esta wallet no participa en ninguna obligación.",
  "my.item": "Obligación #{id}",
  "my.role.proveedor": "Proveedor (creaste)",
  "my.role.deudor": "Deudor (pagás vos)",
  "my.role.acreedor-cedido": "Acreedor por cesión",

  "detail.title": "Obligación #{id} — {desc}",
  "detail.registered": "Registrada en <b>Monad</b> ({chain}) · contrato",
  "chains.monad.title": "Monad — registro verificable",
  "chains.monad.body":
    "La obligación, sus cuotas, vencimientos y estados (PENDING / PAID / OVERDUE / COMPLETED) viven en el contrato. Cada cambio de estado es una transacción en Monad.",
  "chains.solana.title": "Solana — riel de pago",
  "chains.solana.body":
    "Cada cuota se paga en USDC con una transferencia en Solana + memo. El servidor verifica ese pago y recién entonces la cuota pasa a PAID en Monad.",
  "party.debtor": "Deudor (PYME) — paga las cuotas",
  "party.supplier": "Proveedor (acreedor original) — vendió y cobra",
  "party.solana": "Cuenta de cobro original en Solana (USDC)",
  "sum.total": "Monto total",
  "sum.installment": "Cuota",
  "sum.paid": "Pagado",
  "sum.installmentsWord": "cuotas",
  "sum.outstanding": "Saldo pendiente",
  "sum.next": "Próximo vencimiento",
  "sum.nextValue": "{date} (cuota {n})",
  "sum.overdue": "Cuotas vencidas",

  "tbl.title": "Pagarés (cuotas)",
  "tbl.n": "N°",
  "tbl.amount": "Monto (USDC)",
  "tbl.due": "Vencimiento",
  "tbl.status": "Estado (Monad)",
  "tbl.creditor": "Acreedor",
  "tbl.paidOn": "Pagada el",
  "tbl.payment": "Pago (Solana)",
  "tbl.action": "Acción",
  "tbl.selectTitle": "Seleccionar para ceder",
  "tbl.assigned": "cedido",
  "tbl.you": "(vos)",
  "tbl.connectHint": "Conectar wallet para ver tus pagarés y poder ceder",
  "tbl.footer":
    "OVERDUE se calcula al leer (impaga y vencida); no se guarda on-chain. El pago con USDC en Solana se envía con Phantom (devnet) y el servidor verifica la tx (mint, destino = cuenta del acreedor ACTUAL de ese pagaré, monto, memo) antes de marcar la cuota PAID en Monad. La confirmación manual del acreedor sigue disponible como respaldo.",
  "cede.title": "Ceder pagarés a otro acreedor",
  "cede.help":
    "Marcá en la tabla los pagarés que querés ceder ({sel} seleccionados de {total} que son tuyos). Desde la cesión, el deudor paga a la cuenta Solana del nuevo acreedor y solo él (o el verificador) puede marcarlos pagados. El precio de la cesión se acuerda aparte: acá no se mueve dinero.",
  "cede.evm": "Dirección EVM del nuevo acreedor",
  "cede.sol": "Cuenta Solana del nuevo acreedor (donde cobrará los USDC)",
  "cede.err.addr": "La dirección del nuevo acreedor no es válida.",
  "cede.err.buyer": "El nuevo acreedor no puede ser el deudor (PYME).",
  "cede.err.self": "El nuevo acreedor no puede ser vos mismo.",
  "cede.err.wallet": "La cuenta Solana del nuevo acreedor debe ser una wallet válida (no una cuenta PDA/programa).",
  "cede.submit.one": "Ceder {n} pagaré",
  "cede.submit.many": "Ceder {n} pagarés",
  "cede.done": "Cesión registrada en Monad. Transacción:",

  "pay.button": "Pagar con Solana",
  "pay.busy": "Pagando…",
  "pay.sent": "Pago enviado en Solana",
  "pay.memo": "Memo",
  "pay.verifying": "Verificando el pago y registrándolo en Monad…",
  "pay.retry": "Reintentar verificación (no vuelve a cobrar)",
  "mp.onlyCreditor": "Solo el acreedor",
  "mp.button": "Marcar pagada",
  "mp.refLabel": "Referencia del pago",
  "mp.manual": "Confirmación manual del acreedor (sin verificar Solana).",
  "mp.confirm": "Confirmar",
  "mp.confirming": "Confirmando…",
  "mp.cancel": "Cancelar",

  "new.title": "Nueva obligación",
  "new.intro":
    "La firma la wallet del <b>proveedor</b> (acreedor) en {chain}; se registra la obligación y se generan todas las cuotas. El pago de cada cuota será en USDC sobre Solana.",
  "new.noRegistry": "NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada.",
  "new.creditor": "Acreedor: {addr}",
  "new.notConnected": "Wallet no conectada",
  "new.defaultDesc": "Compra de mercadería a crédito",
  "new.f.description": "Descripción",
  "new.f.buyer": "Dirección EVM de la PYME deudora (paga las cuotas)",
  "new.f.solana": "Cuenta Solana del proveedor (recibe los USDC)",
  "new.f.total": "Monto total (USDC)",
  "new.f.count": "Cuotas",
  "new.f.first": "Primer vencimiento",
  "new.f.interval": "Intervalo (días)",
  "new.preview": "Vista previa: {n} × {amount} USDC",
  "new.previewRow": "Cuota {n}: {date}",
  "new.submit": "Crear obligación",
  "new.hint": "Conectá la wallet del acreedor para poder crear.",

  "form.desc": "Ingresá una descripción.",
  "form.buyerInvalid": "La dirección EVM de la PYME deudora no es válida.",
  "form.buyerZero": "La PYME deudora no puede ser la dirección cero.",
  "form.buyerSelf": "La PYME deudora no puede ser la misma wallet que crea la obligación (acreedor).",
  "form.solanaFormat": "La cuenta Solana del acreedor debe ser una pubkey base58 (32–44 caracteres).",
  "form.solanaWallet": "La cuenta Solana del acreedor debe ser una wallet (una cuenta PDA/programa no puede recibir USDC con este flujo).",
  "form.countInt": "La cantidad de cuotas debe ser un entero.",
  "form.countRange": "La cantidad de cuotas debe estar entre 1 y {max}.",
  "form.totalFormat": "El monto total debe ser un número positivo con hasta 6 decimales.",
  "form.totalPositive": "El monto total debe ser mayor a 0.",
  "form.totalDivisible": "El monto total debe dividirse exacto entre las cuotas (sin centésimas de USDC sobrantes).",
  "form.dateMissing": "Ingresá la fecha del primer vencimiento.",
  "form.dateFuture": "El primer vencimiento debe ser una fecha futura.",
  "form.intervalInt": "El intervalo debe ser un entero de días.",
  "form.intervalMin": "Con más de una cuota el intervalo debe ser de al menos 1 día.",

  "err.noEvmWallet": "No se detectó una wallet EVM (instalá MetaMask).",
  "err.noAccount": "La wallet no devolvió ninguna cuenta.",
  "err.noRegistry": "NEXT_PUBLIC_REGISTRY_ADDRESS no está configurada",
  "err.reverted": "La transacción fue revertida.",
  "err.noEvent": "No se encontró el evento ObligationCreated en el receipt.",
  "err.deployFailed": "El despliegue falló o fue revertido.",
  "err.rejected": "Rechazaste la operación en la wallet.",
  "err.unknown": "Error desconocido.",
  "ce.NotOwner": "Solo el owner del contrato puede cambiar el verifier. Conectá la wallet owner.",
  "ce.NotAuthorized": "Solo el acreedor (o el verificador) puede marcar una cuota como pagada.",
  "ce.AlreadyPaid": "Esa cuota ya está pagada.",
  "ce.PaymentRefAlreadyUsed": "Esa referencia de pago ya fue usada en otra cuota; ingresá una distinta.",
  "ce.InstallmentNotFound": "La cuota no existe.",
  "ce.ObligationNotFound": "La obligación no existe.",
  "ce.InvalidParams": "Parámetros inválidos (el nuevo acreedor no puede ser el deudor, ni vos mismo, ni estar vacío).",

  "sol.noPhantom": "No se detectó Phantom (instalá la extensión y usá devnet).",
  "sol.badSeller": "La cuenta Solana del acreedor registrada en la obligación no es una wallet válida.",
  "sol.insufficient": "Saldo de USDC devnet insuficiente para esta cuota.",
  "sol.noUsdc": "Tu wallet no tiene USDC devnet (¿mint correcto y red devnet?).",
  "sol.txFailed": "La transacción de Solana falló.",
  "sol.timeout": "Tiempo agotado esperando la confirmación en Solana (la tx puede haberse enviado igual: revisá el explorer).",
  "sol.rejected": "Rechazaste la operación en Phantom.",
  "sol.confirmFailed": "No se pudo confirmar el pago.",

  "page.errorTitle": "No se pudo leer la obligación",
  "page.errorBody": "La red (Monad) no respondió o el contrato no está disponible. Probá de nuevo en unos segundos.",
  "page.retry": "Reintentar",

  "api.badParams": "Parámetros inválidos (obligationId, number, signature).",
  "api.noObligation": "La obligación no existe.",
  "api.noInstallment": "La cuota no existe.",
  "api.alreadyPaid": "La cuota ya está pagada.",
  "api.txNotFound": "Transacción no encontrada o todavía no confirmada en Solana.",
  "api.sigUsed": "Esa firma ya se usó para otro pago.",
  "api.monadFailed": "No se pudo registrar el pago en Monad: {detail}",
  "api.badJson": "JSON inválido.",
  "api.rateLimit": "Demasiados pedidos; probá de nuevo en un minuto.",
  "api.verifyError": "Error verificando el pago: {detail}",
  "ver.noTx": "Transacción no encontrada.",
  "ver.noMeta": "La transacción no tiene metadatos.",
  "ver.txFailed": "La transacción de Solana falló.",
  "ver.badCreditor": "La cuenta Solana del acreedor registrada no es válida.",
  "ver.noTransfer": "No hay una transferencia USDC válida (mint, destino o monto) hacia el acreedor.",
  "ver.noMemo": 'Falta el memo exacto "{memo}".',
} as const;

export type MessageKey = keyof typeof es;

const en: Record<MessageKey, string> = {
  "app.title": "Finvia — SME supplier financing in installments",
  "app.description": "Supplier financing for SMEs: promissory notes in installments recorded on Monad, paid in USDC on Solana.",
  "nav.back": "← Back",
  "common.connectWallet": "Connect wallet",
  "common.changeAccount": "Switch account",
  "common.waiting": "Waiting for confirmation…",

  "home.intro":
    "Supplier financing for SMEs: the supplier sells on credit and the SME signs promissory notes (installments) recorded on <b>Monad</b> (a verifiable source of truth). Each note is paid in <b>USDC on Solana</b>, and the supplier can <b>assign</b> notes to a third party.",
  "home.network": "Network",
  "home.contract": "Contract",
  "home.count": "Registered obligations",
  "home.notConfigured": "contract not configured",
  "home.readError": "error reading the contract",
  "home.obligations": "Obligations",
  "home.new": "+ New obligation",
  "home.empty": "There are no obligations yet.",
  "home.item": "Obligation #{id} — {desc}",
  "home.footer": "Hackathon MVP. Status and next task in <code>docs/progress/</code>.",

  "my.title": "My notes",
  "my.reading": "Reading from Monad…",
  "my.empty": "This wallet is not part of any obligation.",
  "my.item": "Obligation #{id}",
  "my.role.proveedor": "Supplier (you created it)",
  "my.role.deudor": "Debtor (you pay)",
  "my.role.acreedor-cedido": "Creditor by assignment",

  "detail.title": "Obligation #{id} — {desc}",
  "detail.registered": "Recorded on <b>Monad</b> ({chain}) · contract",
  "chains.monad.title": "Monad — verifiable record",
  "chains.monad.body":
    "The obligation, its installments, due dates and statuses (PENDING / PAID / OVERDUE / COMPLETED) live in the contract. Every status change is a transaction on Monad.",
  "chains.solana.title": "Solana — payment rail",
  "chains.solana.body":
    "Each installment is paid in USDC with a transfer on Solana + memo. The server verifies that payment and only then does the installment become PAID on Monad.",
  "party.debtor": "Debtor (SME) — pays the installments",
  "party.supplier": "Supplier (original creditor) — sold and gets paid",
  "party.solana": "Original collection account on Solana (USDC)",
  "sum.total": "Total amount",
  "sum.installment": "Installment",
  "sum.paid": "Paid",
  "sum.installmentsWord": "installments",
  "sum.outstanding": "Outstanding balance",
  "sum.next": "Next due date",
  "sum.nextValue": "{date} (installment {n})",
  "sum.overdue": "Overdue installments",

  "tbl.title": "Promissory notes (installments)",
  "tbl.n": "No.",
  "tbl.amount": "Amount (USDC)",
  "tbl.due": "Due date",
  "tbl.status": "Status (Monad)",
  "tbl.creditor": "Creditor",
  "tbl.paidOn": "Paid on",
  "tbl.payment": "Payment (Solana)",
  "tbl.action": "Action",
  "tbl.selectTitle": "Select to assign",
  "tbl.assigned": "assigned",
  "tbl.you": "(you)",
  "tbl.connectHint": "Connect your wallet to see your notes and assign them",
  "tbl.footer":
    "OVERDUE is computed when reading (unpaid and past due); it is not stored on-chain. The USDC payment on Solana is sent with Phantom (devnet) and the server verifies the tx (mint, destination = the CURRENT creditor's account for that note, amount, memo) before marking the installment PAID on Monad. The creditor's manual confirmation remains available as a fallback.",
  "cede.title": "Assign notes to another creditor",
  "cede.help":
    "Tick the notes you want to assign in the table ({sel} selected out of {total} that are yours). Once assigned, the debtor pays to the new creditor's Solana account and only they (or the verifier) can mark them as paid. The price of the assignment is agreed separately: no money moves here.",
  "cede.evm": "New creditor's EVM address",
  "cede.sol": "New creditor's Solana account (where they will collect the USDC)",
  "cede.err.addr": "The new creditor's address is not valid.",
  "cede.err.buyer": "The new creditor cannot be the debtor (SME).",
  "cede.err.self": "The new creditor cannot be yourself.",
  "cede.err.wallet": "The new creditor's Solana account must be a valid wallet (not a PDA/program account).",
  "cede.submit.one": "Assign {n} note",
  "cede.submit.many": "Assign {n} notes",
  "cede.done": "Assignment recorded on Monad. Transaction:",

  "pay.button": "Pay with Solana",
  "pay.busy": "Paying…",
  "pay.sent": "Payment sent on Solana",
  "pay.memo": "Memo",
  "pay.verifying": "Verifying the payment and recording it on Monad…",
  "pay.retry": "Retry verification (does not charge again)",
  "mp.onlyCreditor": "Creditor only",
  "mp.button": "Mark as paid",
  "mp.refLabel": "Payment reference",
  "mp.manual": "Manual confirmation by the creditor (Solana not verified).",
  "mp.confirm": "Confirm",
  "mp.confirming": "Confirming…",
  "mp.cancel": "Cancel",

  "new.title": "New obligation",
  "new.intro":
    "The <b>supplier's</b> (creditor's) wallet signs on {chain}; the obligation is recorded and all installments are generated. Each installment will be paid in USDC on Solana.",
  "new.noRegistry": "NEXT_PUBLIC_REGISTRY_ADDRESS is not set.",
  "new.creditor": "Creditor: {addr}",
  "new.notConnected": "Wallet not connected",
  "new.defaultDesc": "Goods purchased on credit",
  "new.f.description": "Description",
  "new.f.buyer": "Debtor SME's EVM address (pays the installments)",
  "new.f.solana": "Supplier's Solana account (receives the USDC)",
  "new.f.total": "Total amount (USDC)",
  "new.f.count": "Installments",
  "new.f.first": "First due date",
  "new.f.interval": "Interval (days)",
  "new.preview": "Preview: {n} × {amount} USDC",
  "new.previewRow": "Installment {n}: {date}",
  "new.submit": "Create obligation",
  "new.hint": "Connect the creditor's wallet to create.",

  "form.desc": "Enter a description.",
  "form.buyerInvalid": "The debtor SME's EVM address is not valid.",
  "form.buyerZero": "The debtor SME cannot be the zero address.",
  "form.buyerSelf": "The debtor SME cannot be the same wallet that creates the obligation (creditor).",
  "form.solanaFormat": "The creditor's Solana account must be a base58 pubkey (32–44 characters).",
  "form.solanaWallet": "The creditor's Solana account must be a wallet (a PDA/program account cannot receive USDC in this flow).",
  "form.countInt": "The number of installments must be an integer.",
  "form.countRange": "The number of installments must be between 1 and {max}.",
  "form.totalFormat": "The total amount must be a positive number with up to 6 decimals.",
  "form.totalPositive": "The total amount must be greater than 0.",
  "form.totalDivisible": "The total amount must divide evenly across the installments (no leftover USDC fractions).",
  "form.dateMissing": "Enter the first due date.",
  "form.dateFuture": "The first due date must be in the future.",
  "form.intervalInt": "The interval must be a whole number of days.",
  "form.intervalMin": "With more than one installment the interval must be at least 1 day.",

  "err.noEvmWallet": "No EVM wallet detected (install MetaMask).",
  "err.noAccount": "The wallet returned no account.",
  "err.noRegistry": "NEXT_PUBLIC_REGISTRY_ADDRESS is not set",
  "err.reverted": "The transaction was reverted.",
  "err.noEvent": "The ObligationCreated event was not found in the receipt.",
  "err.deployFailed": "The deployment failed or was reverted.",
  "err.rejected": "You rejected the operation in your wallet.",
  "err.unknown": "Unknown error.",
  "ce.NotOwner": "Only the contract owner can change the verifier. Connect the owner wallet.",
  "ce.NotAuthorized": "Only the creditor (or the verifier) can mark an installment as paid.",
  "ce.AlreadyPaid": "That installment is already paid.",
  "ce.PaymentRefAlreadyUsed": "That payment reference was already used on another installment; enter a different one.",
  "ce.InstallmentNotFound": "The installment does not exist.",
  "ce.ObligationNotFound": "The obligation does not exist.",
  "ce.InvalidParams": "Invalid parameters (the new creditor cannot be the debtor, yourself, or empty).",

  "sol.noPhantom": "Phantom not detected (install the extension and use devnet).",
  "sol.badSeller": "The creditor's Solana account recorded on the obligation is not a valid wallet.",
  "sol.insufficient": "Insufficient devnet USDC balance for this installment.",
  "sol.noUsdc": "Your wallet has no devnet USDC (correct mint and devnet network?).",
  "sol.txFailed": "The Solana transaction failed.",
  "sol.timeout": "Timed out waiting for confirmation on Solana (the transaction may have been sent anyway: check the explorer).",
  "sol.rejected": "You rejected the operation in Phantom.",
  "sol.confirmFailed": "The payment could not be confirmed.",

  "page.errorTitle": "Could not read the obligation",
  "page.errorBody": "The network (Monad) did not respond or the contract is unavailable. Try again in a few seconds.",
  "page.retry": "Retry",

  "api.badParams": "Invalid parameters (obligationId, number, signature).",
  "api.noObligation": "The obligation does not exist.",
  "api.noInstallment": "The installment does not exist.",
  "api.alreadyPaid": "The installment is already paid.",
  "api.txNotFound": "Transaction not found or not yet confirmed on Solana.",
  "api.sigUsed": "That signature was already used for another payment.",
  "api.monadFailed": "Could not record the payment on Monad: {detail}",
  "api.badJson": "Invalid JSON.",
  "api.rateLimit": "Too many requests; try again in a minute.",
  "api.verifyError": "Error verifying the payment: {detail}",
  "ver.noTx": "Transaction not found.",
  "ver.noMeta": "The transaction has no metadata.",
  "ver.txFailed": "The Solana transaction failed.",
  "ver.badCreditor": "The creditor's recorded Solana account is not valid.",
  "ver.noTransfer": "There is no valid USDC transfer (mint, destination or amount) to the creditor.",
  "ver.noMemo": 'The exact memo "{memo}" is missing.',
};

const dictionaries: Record<Lang, Record<MessageKey, string>> = { es, en };

export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

export function makeTranslator(lang: Lang): Translator {
  const dict = dictionaries[lang];
  return (key, params) => {
    let s: string = dict[key] ?? es[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
}

/** Traductor español por defecto (tests, scripts y llamadas sin contexto de idioma). */
export const tEs: Translator = makeTranslator("es");

const templates = (Object.keys(es) as MessageKey[]).map((key) => {
  const src = es[key] as string;
  const pattern = src
    .split(/(\{\w+\})/)
    .map((p) => (/^\{\w+\}$/.test(p) ? "(.+)" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return { key, params: [...src.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!), re: new RegExp(`^${pattern}$`) };
});

/**
 * Traduce un mensaje que nació en español (errores lanzados por libs/API) al idioma pedido.
 * Si no coincide con ningún mensaje conocido (p. ej. errores crudos de viem/RPC) se devuelve tal cual.
 */
export function localizeMessage(message: string, t: Translator): string {
  for (const { key, params, re } of templates) {
    const m = re.exec(message);
    if (m) return t(key, Object.fromEntries(params.map((p, i) => [p, m[i + 1]!])));
  }
  return message;
}
