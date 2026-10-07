"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { useLang } from "./LangProvider";

/** Selector ES | EN: guarda la elección en una cookie y recarga los datos del servidor. */
export function LanguageSwitch() {
  const lang = useLang();
  const router = useRouter();
  function choose(l: Lang) {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  const btn = (l: Lang) => (
    <button
      type="button"
      onClick={() => choose(l)}
      aria-pressed={lang === l}
      data-testid={`lang-${l}`}
      className={`px-2 py-0.5 rounded ${lang === l ? "bg-white/20 font-semibold" : "text-white/60 hover:text-white"}`}
    >
      {l.toUpperCase()}
    </button>
  );
  return (
    <nav className="mx-auto flex max-w-4xl justify-end gap-1 px-4 pt-3 text-xs sm:px-8" aria-label="Language">
      {btn("es")}
      <span className="text-white/30">|</span>
      {btn("en")}
    </nav>
  );
}
