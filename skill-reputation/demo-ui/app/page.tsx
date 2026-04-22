import { Dashboard } from "./ui/Dashboard";

export default function Page() {
  return (
    <main>
      <h1>SkillReputation</h1>
      <p className="lead">
        Recent <span className="mono">Attested</span> events on Base Sepolia (read-only).
      </p>
      <Dashboard />
    </main>
  );
}
