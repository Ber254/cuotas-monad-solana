"use client";

import { useT } from "@/components/LangProvider";

/** Error de render (p. ej. el RPC de Monad no responde): mensaje claro en vez de una pantalla en blanco. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8 space-y-4" data-testid="error-page">
      <h1 className="text-xl font-bold">{t("page.errorTitle")}</h1>
      <p className="text-sm text-white/70">
        {t("page.errorBody")}
      </p>
      <p className="text-xs text-white/40 font-mono break-all">{error.digest ?? error.message.split("\n")[0]}</p>
      <button type="button" onClick={reset} className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
        {t("page.retry")}
      </button>
    </main>
  );
}
