"use client";

/** Error de render (p. ej. el RPC de Monad no responde): mensaje claro en vez de una pantalla en blanco. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8 space-y-4" data-testid="error-page">
      <h1 className="text-xl font-bold">No se pudo leer la obligación</h1>
      <p className="text-sm text-white/70">
        La red (Monad) no respondió o el contrato no está disponible. Probá de nuevo en unos segundos.
      </p>
      <p className="text-xs text-white/40 font-mono break-all">{error.digest ?? error.message.split("\n")[0]}</p>
      <button type="button" onClick={reset} className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
        Reintentar
      </button>
    </main>
  );
}
