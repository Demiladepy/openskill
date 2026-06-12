#!/usr/bin/env node
/**
 * Verify ERC-8004 registration + job delivery on BSC testnet.
 */
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import { loadAgentEnv, getAgentStatePath, readAgentStateSync } from "./lib/loadAgentEnv.js";

loadAgentEnv();

function parseArgs(argv) {
  let jobId;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--job-id" && argv[i + 1]) jobId = argv[++i];
  }
  return { jobId };
}

async function verifyTx(txHash, label) {
  if (!txHash || String(txHash).includes("simulate")) {
    return { ok: false, label, reason: "No live tx hash (simulate mode?)" };
  }
  const rpc = process.env.BNB_RPC_URL || process.env.RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";
  const client = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    return {
      ok: receipt.status === "success",
      label,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      explorer: `https://testnet.bscscan.com/tx/${txHash}`,
    };
  } catch (err) {
    return { ok: false, label, txHash, error: err instanceof Error ? err.message : String(err) };
  }
}

async function verifyRegistration() {
  const state = readAgentStateSync() || JSON.parse(await fs.readFile(getAgentStatePath(), "utf8").catch(() => "{}"));
  const txHash = state.registrationTxHash || state.transactionHash;
  const check = await verifyTx(txHash, "erc8004_registration");
  return {
    ...check,
    agentId: state.agentId || state.agent_id,
    mode: state.mode,
    wallet: state.wallet,
  };
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

  const deliveryCheck = row.delivery?.deliveryTxHash
    ? await verifyTx(row.delivery.deliveryTxHash, "job_delivery_proof")
    : null;

  console.log(
    JSON.stringify(
      {
        jobId: row.jobId,
        status: row.status,
        strategy: row.strategy,
        asset: row.asset,
        mode: row.mode,
        result: row.result,
        delivery: deliveryCheck || row.delivery,
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

  const registration = await verifyRegistration();
  console.log(JSON.stringify({ registration }, null, 2));

  if (!registration.ok && registration.mode === "live") {
    console.error("Registration tx verification failed");
    process.exit(1);
  }

  if (!jobId) {
    const state = readAgentStateSync();
    const lastJob = state?.jobs?.slice(-1)[0];
    if (lastJob) {
      console.log(`\nVerifying latest job: ${lastJob.jobId}`);
      if (lastJob.mode === "onchain") {
        const ok = await verifyOnChain(lastJob.jobId);
        process.exit(ok ? 0 : 1);
      }
      const ok = await verifyLocal(lastJob.jobId);
      process.exit(ok ? 0 : 1);
    }
    console.log("\nNo --job-id provided; registration check complete.");
    process.exit(registration.mode === "simulate" ? 0 : registration.ok ? 0 : 1);
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
