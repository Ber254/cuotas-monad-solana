// Genera una wallet EVM NUEVA para el verifier y guarda su clave privada en web/.verifier-key (ignorado por git).
// La clave NO se imprime: así no hay riesgo de pegarla en un chat o una captura. Solo muestra la dirección (pública).
//   npm run verifier:new            (no sobrescribe un archivo existente; --force para reemplazarlo)
import fs from "node:fs";
import path from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const file = process.env.VERIFIER_KEY_FILE ?? path.resolve(import.meta.dirname, "..", ".verifier-key");
if (fs.existsSync(file) && !process.argv.includes("--force")) {
  const addr = privateKeyToAccount(fs.readFileSync(file, "utf8").trim() as `0x${string}`).address;
  console.log(`Ya existe ${file}\nDirección del verifier: ${addr}\n(usá --force solo si querés reemplazarla: perderías la clave anterior)`);
  process.exit(0);
}
const key = generatePrivateKey();
fs.writeFileSync(file, key + "\n", { mode: 0o600 });
console.log(`Wallet verifier creada.\nDirección (pública, se puede compartir): ${privateKeyToAccount(key).address}\nLa clave quedó guardada en: ${file}\nNO la muestres, NO la pegues en ningún chat y NO la subas a git (el archivo ya está en .gitignore).`);
