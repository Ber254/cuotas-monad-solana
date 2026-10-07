// Genera un keypair de Solana NUEVO y lo guarda en un archivo (formato JSON de `solana-keygen`, compatible con
// `npm run pay:devnet -- --keypair <archivo>`). La clave NO se imprime; solo la dirección pública.
//   npm run solana:new -- --out .solana-payer.json       (no sobrescribe un archivo existente)
import fs from "node:fs";
import path from "node:path";
import { Keypair } from "@solana/web3.js";

const i = process.argv.indexOf("--out");
const out = i > 0 ? process.argv[i + 1] : undefined;
if (!out) { console.error("Uso: npm run solana:new -- --out .solana-<nombre>.json"); process.exit(2); }
const file = path.resolve(process.cwd(), out);

if (fs.existsSync(file)) {
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
  console.log(`Ya existe ${file}\nDirección pública: ${kp.publicKey.toBase58()}\n(no se sobrescribe)`);
  process.exit(0);
}
const kp = Keypair.generate();
fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
console.log(`Wallet de Solana creada.\nDirección pública (se puede compartir): ${kp.publicKey.toBase58()}\nLa clave quedó en: ${file}\nNO abras ni muestres ese archivo, NO lo pegues en ningún chat y NO lo subas a git.`);
