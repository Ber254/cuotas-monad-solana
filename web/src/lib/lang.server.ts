import { cookies, headers } from "next/headers";
import { LANG_COOKIE, detectLang, makeTranslator, type Lang, type Translator } from "./i18n";

/** Idioma de la request actual (Server Components / route handlers): cookie > Accept-Language > inglés. */
export async function getLang(): Promise<Lang> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return detectLang(c.get(LANG_COOKIE)?.value, h.get("accept-language"));
}

export async function getT(): Promise<{ lang: Lang; t: Translator }> {
  const lang = await getLang();
  return { lang, t: makeTranslator(lang) };
}
