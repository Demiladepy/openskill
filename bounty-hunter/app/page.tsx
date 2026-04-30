"use client";

import { useEffect, useMemo, useState } from "react";

type ReputationState = {
  enabled: boolean;
  score: number;
  confidence: number;
  reasons: string[];
  provenance: string;
  details: string;
};

type DecisionState = {
  status: "approved_for_payment" | "rejected" | "needs_manual_review";
  confidence: number;
  reasons: string[];
  readyForFinance: boolean;
};

type StreamState = {
  scout: Record<string, unknown> | null;
  verifier: Record<string, unknown> | null;
  reputation: ReputationState | null;
  decision: DecisionState | null;
  error: string | null;
};

type RunRow = {
  id: string;
  repo: string;
  pr_number: number;
  expected_author: string;
  bounty_title: string;
  status: string;
  confidence: number | null;
  created_at: number;
};

type ContributorRow = {
  github_username: string;
  total_runs: number;
  approved_count: number;
  rejected_count: number;
  avg_confidence: number;
};

export default function HomePage() {
  const [form, setForm] = useState({
    repo: "",
    prNumber: "",
    expectedAuthor: "",
    bountyTitle: "",
    requestedAmountUsd: "",
    notes: "",
    priority: "normal" as "low" | "normal" | "high"
  });
  const [state, setState] = useState<StreamState>({
    scout: null,
    verifier: null,
    reputation: null,
    decision: null,
    error: null
  });
  const [timeline, setTimeline] = useState<Array<{ stage: string; status: string; message?: string }>>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [contributors, setContributors] = useState<ContributorRow[]>([]);
  const [running, setRunning] = useState(false);

  async function loadDashboard() {
    const [runsResp, contributorsResp] = await Promise.all([fetch("/api/runs"), fetch("/api/contributors")]);
    if (runsResp.ok) {
      const payload = (await runsResp.json()) as { runs: RunRow[] };
      setRuns(payload.runs);
    }
    if (contributorsResp.ok) {
      const payload = (await contributorsResp.json()) as { contributors: ContributorRow[] };
      setContributors(payload.contributors);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const successRate = useMemo(() => {
    if (runs.length === 0) return 0;
    const success = runs.filter((run) => run.status === "approved_for_payment").length;
    return Math.round((success / runs.length) * 100);
  }, [runs]);

  async function runPipeline(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setTimeline([]);
    setState({ scout: null, verifier: null, reputation: null, decision: null, error: null });

    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        prNumber: Number(form.prNumber),
        requestedAmountUsd: form.requestedAmountUsd ? Number(form.requestedAmountUsd) : undefined
      })
    });

    if (!response.ok || !response.body) {
      const msg = await response.text();
      setState((s) => ({ ...s, error: `Request failed: ${msg}` }));
      setRunning(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const eventLine = part.split("\n").find((x) => x.startsWith("event:"));
        const dataLine = part.split("\n").find((x) => x.startsWith("data:"));
        if (!eventLine || !dataLine) continue;
        const event = eventLine.replace("event:", "").trim();
        const payload = JSON.parse(dataLine.replace("data:", "").trim());

        if (event === "scout") setState((s) => ({ ...s, scout: payload }));
        if (event === "verifier") setState((s) => ({ ...s, verifier: payload }));
        if (event === "reputation") setState((s) => ({ ...s, reputation: payload as ReputationState }));
        if (event === "decision") setState((s) => ({ ...s, decision: payload as DecisionState }));
        if (event === "stage") {
          setTimeline((current) => [...current, payload as { stage: string; status: string; message?: string }]);
        }
        if (event === "error") setState((s) => ({ ...s, error: payload.message as string }));
        if (event === "done") {
          setRunning(false);
          void loadDashboard();
        }
      }
    }

    setRunning(false);
    void loadDashboard();
  }

  return (
    <main>
      <h1>Bounty Hunter AI Ops</h1>
      <p className="small">Run AI-powered bounty decisions with evidence, confidence, and finance-ready outcomes.</p>

      <section className="panel metrics">
        <div>
          <h3>Total runs</h3>
          <p>{runs.length}</p>
        </div>
        <div>
          <h3>Approval rate</h3>
          <p>{successRate}%</p>
        </div>
        <div>
          <h3>Manual review queue</h3>
          <p>{runs.filter((run) => run.status === "needs_manual_review").length}</p>
        </div>
      </section>

      <section className="panel">
        <h2>New Run</h2>
        <form onSubmit={runPipeline}>
          <label>bountyTitle
            <input value={form.bountyTitle} onChange={(e) => setForm({ ...form, bountyTitle: e.target.value })} required />
          </label>
          <label>repo (owner/name)
            <input value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} required />
          </label>
          <label>prNumber
            <input value={form.prNumber} onChange={(e) => setForm({ ...form, prNumber: e.target.value })} required />
          </label>
          <label>expectedAuthor
            <input value={form.expectedAuthor} onChange={(e) => setForm({ ...form, expectedAuthor: e.target.value })} required />
          </label>
          <label>priority
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "low" | "normal" | "high" })}>
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>requestedAmountUsd (optional)
            <input value={form.requestedAmountUsd} onChange={(e) => setForm({ ...form, requestedAmountUsd: e.target.value })} />
          </label>
          <label className="full">notes (optional)
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div>
            <button type="submit" disabled={running}>{running ? "Running..." : "Start run"}</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Run Timeline</h2>
        {timeline.length === 0 ? <p>No run started yet.</p> : (
          <ul className="timeline">
            {timeline.map((item, idx) => (
              <li key={`${item.stage}-${idx}`}>
                <strong>{item.stage}</strong> <span className="badge">{item.status}</span>
                {item.message ? <p>{item.message}</p> : null}
              </li>
            ))}
          </ul>
        )}
        {state.error && <p className="error">Run failure: {state.error}</p>}
      </section>

      <section className="panel">
        <h2>Decision</h2>
        {state.decision ? (
          <>
            <p><strong>Status:</strong> {state.decision.status}</p>
            <p><strong>Confidence:</strong> {Math.round(state.decision.confidence * 100)}%</p>
            <p><strong>Ready for finance:</strong> {state.decision.readyForFinance ? "yes" : "no"}</p>
            <pre>{JSON.stringify(state.decision.reasons, null, 2)}</pre>
          </>
        ) : <p>Decision appears once a run completes.</p>}
      </section>

      <section className="panel">
        <h2>Recent Runs</h2>
        {runs.length === 0 ? <p>No runs recorded.</p> : (
          <ul className="list">
            {runs.slice(0, 10).map((run) => (
              <li key={run.id}>
                <strong>{run.bounty_title}</strong> - {run.repo}#{run.pr_number} - {run.status}
                {typeof run.confidence === "number" ? ` (${Math.round(run.confidence * 100)}%)` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Contributors</h2>
        {contributors.length === 0 ? <p>No contributor stats yet.</p> : (
          <ul className="list">
            {contributors.map((c) => (
              <li key={c.github_username}>
                <strong>{c.github_username}</strong> - runs: {c.total_runs}, approved: {c.approved_count}, rejected: {c.rejected_count}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
