import "./globals.css";

export const metadata = {
  title: "Bounty Hunter v0",
  description: "Merged PR verification + Safe USDC payout"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
