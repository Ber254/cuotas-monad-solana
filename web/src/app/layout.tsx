import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finvia — financiamiento PYME en cuotas",
  description: "Obligaciones de pago de PYMEs en cuotas: registro en Monad, pago en USDC sobre Solana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
