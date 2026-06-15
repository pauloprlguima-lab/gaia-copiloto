import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAIA Copiloto Comercial",
  description: "Método GAIA no bolso do gerente comercial.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
