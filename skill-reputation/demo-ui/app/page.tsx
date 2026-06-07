import { Dashboard } from "./ui/Dashboard";
import { ExportPanel } from "./ui/ExportPanel";

export default function Page() {
  return (
    <main>
      <h1>CMC Strategy Verification Dashboard</h1>
      <p className="lead">
        CoinMarketCap Track 2 — strategy attestation audit and marketplace export.
      </p>
      <ExportPanel />
      <Dashboard />
    </main>
  );
}