#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  filterLogByWindow,
  readAttestations,
  readBehaviorLog,
  readStrategyFingerprints,
} from "../src/lib/behaviorLog.js";
import { getBehaviorLogPath } from "../src/lib/logPath.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import { twakConfigFingerprint, loadTwakSession } from "../skill/scripts/lib/twakClient.js";
import { readAgentStateSync } from "../bnbagent/lib/loadAgentEnv.js";

loadProjectEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CMC_ENDPOINTS = [
  "/v1/cryptocurrency/quotes/latest",
  "/v1/cryptocurrency/ohlcv/historical",
  "/v1/social/coin/latest",
  "/v1/derivatives/open-interest/latest",
  "/v3/fear-and-greed/historical",
];

function parseArgs(argv) {
  let from = process.env.REPLAY_FROM || "2026-06-01";
  let to = process.env.REPLAY_TO || "2026-06-28";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--from" && argv[i + 1]) from = argv[++i];
    else if (argv[i] === "--to" && argv[i + 1]) to = argv[++i];
  }
  return { from, to };
}

function buildReplaySteps(lines) {
  const steps = [];
  let cumulativePnl = 0;
  let equity = 10000;

  for (const row of lines) {
    if (row.type === "backtest_decision") {
      const pnlDelta = row.pnlPct ? (equity * row.pnlPct) / 100 : 0;
      if (row.signal === "exit" && row.pnlPct) {
        cumulativePnl += pnlDelta;
        equity += pnlDelta;
      }
      steps.push({
        timestamp: row.ts || row.timestamp,
        signal: row.signal,
        decision: row.signal === "buy" ? "buy" : row.signal === "sell" ? "sell" : "hold",
        price: row.price,
        indicators: { fastMa: row.fastMa, slowMa: row.slowMa, confidence: row.confidence },
        executionPrice: row.price,
        cumulativePnlPct: Number(((equity - 10000) / 100).toFixed(4)),
        equity,
        cmcDataState: row.note || "",
      });
    }
    if (row.type === "attest") {
      steps.push({
        timestamp: row.ts,
        signal: "attest",
        decision: row.mode,
        txHash: row.txHash,
        strategyKey: row.strategyKey,
        digest: row.digest,
      });
    }
  }
  return steps;
}

export async function generateReplayReport(opts = {}) {
  const logPath = getBehaviorLogPath();
  const allLines = await readBehaviorLog(logPath);
  const windowLines = filterLogByWindow(allLines, opts.from, opts.to);

  const backtestSpecs = allLines.filter((l) => l.type === "backtest_spec");
  const replaySteps = buildReplaySteps(windowLines.length ? windowLines : allLines);

  const metrics = backtestSpecs.at(-1)?.metrics || {};
  const labels = replaySteps.map((s) => s.timestamp);
  const equitySeries = replaySteps.map((s) => s.equity ?? 0);
  const pnlSeries = replaySteps.map((s) => s.cumulativePnlPct ?? 0);

  const outDir = path.join(ROOT, "replay", "output");
  await fs.mkdir(outDir, { recursive: true });

  const htmlPath = path.join(outDir, "replay_report.html");
  const manifestPath = path.join(outDir, "submission_manifest.json");
  const replayDataPath = path.join(outDir, "replay_data.json");

  await fs.writeFile(replayDataPath, JSON.stringify(replaySteps, null, 2));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CMC Strategy Forge — Live PnL Replay</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Inter, sans-serif; background: #0b1020; color: #e8ecf5; padding: 24px; }
    .card { background: #151d33; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #2a3555; padding: 8px; text-align: left; }
  </style>
</head>
<body>
  <h1>CMC Strategy PnL Replay</h1>
  <p>Track 2 judging window: ${opts.from} → ${opts.to} (simulated replay from behavior-log.jsonl)</p>
  <div class="card"><canvas id="chart"></canvas></div>
  <div class="card">
    <h2>Step-by-step decisions</h2>
    <table>
      <thead><tr><th>Time</th><th>Signal</th><th>Price</th><th>CMC state</th><th>Cumulative PnL %</th><th>Equity</th></tr></thead>
      <tbody>
        ${replaySteps
          .filter((s) => s.signal !== "attest")
          .map(
            (s) =>
              `<tr><td>${s.timestamp}</td><td>${s.decision}</td><td>${s.price ?? "-"}</td><td>${s.cmcDataState || JSON.stringify(s.indicators || {})}</td><td>${s.cumulativePnlPct ?? "-"}</td><td>${s.equity ?? "-"}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>
  <script>
    new Chart(document.getElementById('chart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [
          { label: 'Equity', data: ${JSON.stringify(equitySeries)}, borderColor: '#60a5fa' },
          { label: 'Cumulative PnL %', data: ${JSON.stringify(pnlSeries)}, borderColor: '#34d399' }
        ]
      }
    });
  </script>
</body>
</html>`;

  await fs.writeFile(htmlPath, html, "utf8");

  const attestations = await readAttestations(logPath);
  const fingerprints = await readStrategyFingerprints(logPath);
  const { session } = await loadTwakSession();
  const agentState = readAgentStateSync();

  const manifest = {
    project: "CMC Strategy Forge",
    track: "BNB Hackathon Track 2 — Strategy Skills",
    replay_window: { from: opts.from, to: opts.to },
    strategy_fingerprints: fingerprints,
    attestation_tx_hashes: attestations.map((a) => ({
      txHash: a.txHash,
      mode: a.mode,
      strategyKey: a.strategyKey,
      digest: a.digest,
    })),
    bnb_ai_agent: {
      agent_id: agentState?.agentId ?? agentState?.agent_id ?? null,
      registration_tx: agentState?.transactionHash ?? null,
      erc8004_registry:
        agentState?.registry || process.env.ERC8004_REGISTRY_ADDRESS || "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      erc8183_commerce: process.env.ERC8183_COMMERCE_ADDRESS || "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de",
      job_transactions: (agentState?.jobs || []).map((j) => ({
        jobId: j.jobId,
        status: j.status,
        mode: j.mode,
        fund_tx: j.fund_tx,
        strategy: j.strategy,
      })),
      endpoint: agentState?.endpoint || process.env.AGENT_SERVER_URL || null,
    },
    cmc_data_api_endpoints: CMC_ENDPOINTS,
    twak_config_fingerprint: twakConfigFingerprint(session),
    bnb_chain_transactions: attestations
      .filter((a) => a.mode === "live")
      .map((a) => ({ txHash: a.txHash, explorer: a.explorer })),
    backtest_parameters: { slippage: "0.1%", fee: "0.05%", venue: "PancakeSwap reference / BSC perps simulation" },
    performance_summary: metrics,
    generated_at: new Date().toISOString(),
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return { htmlPath, manifestPath, replayDataPath, steps: replaySteps.length };
}

async function main() {
  const opts = parseArgs(process.argv);
  const out = await generateReplayReport(opts);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
