import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/confirmPayment";
import { createConfirmDeps } from "@/lib/verifier.server";

export const dynamic = "force-dynamic";

/** POST { obligationId, number, signature }: verifica el pago en Solana y marca la cuota PAID en Monad. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  let deps;
  try {
    deps = createConfirmDeps();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  try {
    const { status, body: out } = await confirmPayment(body, deps);
    return NextResponse.json(out, { status });
  } catch (e) {
    return NextResponse.json({ error: `Error verificando el pago: ${(e as Error).message.split("\n")[0]}` }, { status: 502 });
  }
}
