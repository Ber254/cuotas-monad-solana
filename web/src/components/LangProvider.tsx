"use client";

import { createContext, useContext, useMemo } from "react";
import { makeTranslator, type Lang, type Translator } from "@/lib/i18n";

const LangContext = createContext<Lang>("es");

/** Provee el idioma resuelto en el servidor a todos los Client Components. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): { lang: Lang; t: Translator } {
  const lang = useLang();
  return useMemo(() => ({ lang, t: makeTranslator(lang) }), [lang]);
}
