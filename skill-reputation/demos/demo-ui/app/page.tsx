import { Dashboard } from "./ui/Dashboard";
import { ExportPanel } from "./ui/ExportPanel";

export default function Page() {
  return (
    <main>
      <h1>CMC Strategy Forge</h1>
      <p className="lead">Track 2 dashboard — export skills and (optionally) inspect BSC attestations.</p>
      <ExportPanel />
      <Dashboard />
    </main>
  );
}