// Verifica el build de producción: ningún secreto de servidor en los bundles del navegador y las
// NEXT_PUBLIC_* esperadas embebidas. Uso (después de `npm run build`):
//   VERIFIER_PRIVATE_KEY=<clave> NEXT_PUBLIC_REGISTRY_ADDRESS=<addr> node scripts/check-deploy.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", ".next");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const js = (dir) => (fs.existsSync(dir) ? walk(dir).filter((f) => f.endsWith(".js")) : []);
const read = (f) => fs.readFileSync(f, "utf8");

const clientFiles = js(path.join(root, "static"));
if (!clientFiles.length) { console.error("✗ No hay build (.next/static). Corré `npm run build` antes."); process.exit(1); }
const client = clientFiles.map(read).join("\n");

const problems = [];
const secret = process.env.VERIFIER_PRIVATE_KEY;
// 1) Vector de fuga real: Next embebe en el navegador TODA variable NEXT_PUBLIC_*. Ninguna debe parecer un secreto.
for (const [k, v] of Object.entries(process.env)) {
  if (!k.startsWith("NEXT_PUBLIC_")) continue;
  if (/KEY|SECRET|PRIVATE|VERIFIER|TOKEN|PASSWORD/i.test(k)) problems.push(`${k}: nombre de secreto con prefijo NEXT_PUBLIC_ (se publicaría en el navegador)`);
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(v ?? "")) problems.push(`${k}: el valor tiene forma de clave privada (64 hex) y se publicaría en el navegador`);
}
// 2) Comparación de valor contra los bundles. Sin la variable no se puede: se avisa en vez de dar un falso OK.
if (!secret) console.warn("⚠ VERIFIER_PRIVATE_KEY no está definida en este shell: se omite la comparación de VALOR (solo se revisan nombres y variables NEXT_PUBLIC_*).");
if (secret) {
  const bare = secret.replace(/^0x/, "").toLowerCase();
  if (client.toLowerCase().includes(bare)) problems.push("la clave del verifier aparece en un bundle del navegador");
}
if (/VERIFIER_PRIVATE_KEY/.test(client)) problems.push("el nombre VERIFIER_PRIVATE_KEY aparece en un bundle del navegador");
for (const name of ["SOLANA_RPC_URL", "SOLANA_USDC_MINT"]) if (new RegExp(`process\\.env\\.${name}\\b`).test(client)) problems.push(`${name} (solo servidor) se lee en código del navegador`);
const reg = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
if (reg && !client.includes(reg)) problems.push("NEXT_PUBLIC_REGISTRY_ADDRESS no quedó embebida (¿se cambió después de buildear?)");

if (problems.length) { console.error("✗ " + problems.join("\n✗ ")); process.exit(1); }
console.log(`✓ ${clientFiles.length} bundles del navegador revisados: sin secretos de servidor${secret ? " (valor de la clave comparado)" : ""}${reg ? "; contrato embebido OK" : ""}.`);
