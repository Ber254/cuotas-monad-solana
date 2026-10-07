import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/confirmPayment";
import { detectLang, localizeMessage, makeTranslator } from "@/lib/i18n";
import { createRateLimiter } from "@/lib/rateLimit";
import { createConfirmDeps } from "@/lib/verifier.server";

export const dynamic = "force-dynamic";
// web3.js y viem necesitan Node (no Edge). Verificar en Solana + esperar el receipt de Monad puede pasar de
// los 10 s por defecto de Vercel Hobby; 60 s es el máximo permitido allí.
export const runtime = "nodejs";
export const maxDuration = 60;

// 30 pedidos/minuto por IP (la UI reintenta hasta 6 veces por pago).
const allow = createRateLimiter(30, 60_000);

/** POST { obligationId, number, signature }: verifica el pago en Solana y marca la cuota PAID en Monad. */
export async function POST(req: Request) {
  // Sin Accept-Language (scripts, curl) se responde en español, como siempre; la UI manda su idioma.
  const accept = req.headers.get("accept-language");
  const t = makeTranslator(accept && accept !== "*" ? detectLang(null, accept) : "es");
  const fail = (error: string, status: number) => NextResponse.json({ error: localizeMessage(error, t) }, { status });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(ip)) return fail("Demasiados pedidos; probá de nuevo en un minuto.", 429);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("JSON inválido.", 400);
  }
  let deps;
  try {
    deps = createConfirmDeps();
  } catch (e) {
    return fail((e as Error).message, 500);
  }
  try {
    const { status, body: out } = await confirmPayment(body, deps);
    const o = out as { error?: string };
    return NextResponse.json(o.error ? { ...o, error: localizeMessage(o.error, t) } : out, { status });
  } catch (e) {
    return fail(`Error verificando el pago: ${(e as Error).message.split("\n")[0]}`, 502);
  }
}
