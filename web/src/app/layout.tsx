import type { Metadata } from "next";
import { LangProvider } from "@/components/LangProvider";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getT } from "@/lib/lang.server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("app.title"), description: t("app.description") };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lang } = await getT();
  return (
    <html lang={lang}>
      <body className="antialiased">
        <LangProvider lang={lang}>
          <LanguageSwitch />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
