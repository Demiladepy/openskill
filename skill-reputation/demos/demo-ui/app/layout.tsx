import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CMC Strategy Forge",
  description: "Optional demo UI — BSC testnet attestation explorer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
