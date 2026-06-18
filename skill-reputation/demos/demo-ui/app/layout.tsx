import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forge Skills — CMC Strategy Forge",
  description: "Agent Skills-style docs for CoinMarketCap quant strategy skills",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
