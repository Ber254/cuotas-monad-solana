import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuotas — Monad + Solana",
  description: "MVP de obligaciones de pago en cuotas: registro en Monad, pago en USDC sobre Solana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
