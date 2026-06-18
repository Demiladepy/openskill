"use client";

import { useState } from "react";

export function ExportPanel() {
  const [strategy, setStrategy] = useState("momentum");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportPackage(fromScan = false) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/marketplace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy, fromScan }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Export failed");
      setResult(JSON.stringify(data.result, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <label>
        Strategy skill
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <option value="momentum">Momentum Merger</option>
          <option value="sentiment">Sentiment Divergence</option>
          <option value="regime">Regime Detector</option>
        </select>
      </label>
      <div className="panelActions">
        <button type="button" className="btnPrimary" disabled={loading} onClick={() => exportPackage(false)}>
          {loading ? "Exporting…" : "Export strategy zip"}
        </button>
        <button type="button" className="btnSecondary" disabled={loading} onClick={() => exportPackage(true)}>
          Export all skills bundle
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {result && <pre>{result}</pre>}
    </div>
  );
}
