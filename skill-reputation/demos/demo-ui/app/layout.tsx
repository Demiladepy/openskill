import type { Metadata } from "next";
import { EB_Garamond, Varela_Round } from "next/font/google";
import "./globals.css";

const varela = Varela_Round({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-varela",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
});

export const metadata: Metadata = {
  title: "Forge Skills — Documentation",
  description: "Official documentation for CoinMarketCap quant strategy skills built for AI agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${varela.variable} ${garamond.variable}`}>{children}</body>
    </html>
  );
}
