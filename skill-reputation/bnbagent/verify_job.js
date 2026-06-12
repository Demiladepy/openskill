#!/usr/bin/env node
/**
 * Verify ERC-8183 / HTTP job status and print judge-friendly summary.
 */
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAgentEnv, getAgentStatePath, readAgentStateSync } from "./lib/loadAgentEnv.js";

loadAgentEnv();

function parseArgs(argv) {
  let jobId;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--job-id" && argv[i + 1]) jobId = argv[++i];
  }
  return { jobId };
}

async function verifyOnChain(jobId) {
  const py = process.env.PYTHON || "python";
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "verify_job.py");
  const result = spawnSync(py, [script, "--job-id", jobId], {
    cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
    env: process.env,
    encoding: "utf8",
  });
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  return result.status === 0;
}

async function verifyLocal(jobId) {
  const state = readAgentStateSync() || JSON.parse(await fs.readFile(getAgentStatePath(), "utf8").catch(() => "{}"));
  const jobs = state.jobs || [];
  const row = jobs.find((j) => String(j.jobId) === String(jobId));
  if (!row) {
    const base = process.env.AGENT_SERVER_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${base}/api/jobs/${jobId}/result`);
      if (res.ok) {
        const result = await res.json();
        console.log(
          JSON.stringify(
            {
              jobId,
              status: "COMPLETED",
              result,
              summary: formatSummary(result),
            },
            null,
            2
          )
        );
        return true;
      }
    } catch {
      /* offline */
    }
    console.error(`Job ${jobId} not found in agent_state.json or agent server`);
    return false;
  }

  console.log(
    JSON.stringify(
      {
        jobId: row.jobId,
        status: row.status,
        strategy: row.strategy,
        mode: row.mode,
        result: row.result,
        summary: formatSummary(row.result),
      },
      null,
      2
    )
  );
  return true;
}

function formatSummary(result) {
  if (!result?.metrics) return "No metrics";
  const m = result.metrics;
  return `Sharpe ${m.sharpe_ratio ?? m.sharpeRatio ?? 0}, Max DD ${m.max_drawdown_pct ?? m.maxDrawdownPct ?? 0}%`;
}

async function main() {
  const { jobId } = parseArgs(process.argv);
  if (!jobId) {
    console.error("Usage: node verify_job.js --job-id <id>");
    process.exit(1);
  }

  const state = readAgentStateSync();
  const lastJob = state?.jobs?.find((j) => String(j.jobId) === jobId);
  if (lastJob?.mode === "onchain") {
    const ok = await verifyOnChain(jobId);
    process.exit(ok ? 0 : 1);
  }

  const ok = await verifyLocal(jobId);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
