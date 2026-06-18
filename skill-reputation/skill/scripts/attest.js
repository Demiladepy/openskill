#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectEnv } from "../../src/lib/loadEnv.js";
import { getBehaviorLogPath } from "../../src/lib/logPath.js";
import { parseFrontmatter } from "./lib/parseFrontmatter.js";
import { computeSkillKey, normalizeName } from "./lib/skillKey.js";
import {
  appendTwakLog,
  getAttestMode,
  initTwakAutonomous,
  twakConfigFingerprint,
} from "./lib/twakClient.js";
import {
  attestStrategyDigest,
  computeStrategyDigest,
} from "./lib/attestationSigning.js";
import { keccak256, stringToBytes } from "viem";

loadProjectEnv();

const AGENT_STATE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../bnbagent/agent_state.json"
);

async function saveAttestationToAgentState(explorer, txHash) {
  if (!explorer && !txHash) return;
  try {
    const existing = JSON.parse(await fs.readFile(AGENT_STATE, "utf8"));
    existing.attestationExplorer = explorer || existing.attestationExplorer;
    existing.attestation_tx = txHash || existing.attestation_tx;
    await fs.writeFile(AGENT_STATE, JSON.stringify(existing, null, 2), "utf8");
  } catch {
    /* agent_state optional */
  }
}

function parseArgs(argv) {
  let target;
  let score = 85;
  let backtestPath;
  for (let i = 2; i < argv.length; i++) {
    if ((argv[i] === "--skill" || argv[i] === "--strategy") && argv[i + 1]) target = argv[++i];
    else if (argv[i] === "--score" && argv[i + 1]) score = Number(argv[++i]);
    else if (argv[i] === "--backtest" && argv[i + 1]) backtestPath = argv[++i];
  }
  return { target, score, backtestPath };
}

async function readLastScanDigest(logPath) {
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  for (const line of raw.trim().split("\n").filter(Boolean).reverse()) {
    try {
      const row = JSON.parse(line);
      if (row.type === "scan" && row.digest) return row.digest;
    } catch {
      /* skip */
    }
  }
  return keccak256(stringToBytes("empty-log"));
}

function matchesStrategyAlias(targetName, strategyName) {
  const t = normalizeName(targetName);
  const s = normalizeName(strategyName);
  if (t === s || t.includes(s) || s.includes(t)) return true;
  return ["momentum", "sentiment", "regime"].some((alias) => t === alias && s.includes(alias));
}

async function findStrategyKeyByName(logPath, targetName) {
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  for (const line of raw.trim().split("\n").filter(Boolean).reverse()) {
    try {
      const row = JSON.parse(line);
      const list = row.snapshot?.strategies || row.snapshot?.skills || [];
      if (row.type !== "scan" || !list.length) continue;
      const matches = list.filter((s) => matchesStrategyAlias(targetName, s.name));
      if (!matches.length) continue;
      const preferred =
        matches.find((s) => s.kind === "implementation") ||
        matches.find((s) => s.path?.endsWith(".js")) ||
        matches[0];
      return preferred.skillKey || preferred.strategyKey;
    } catch {
      /* skip */
    }
  }
  return null;
}

async function strategyKeyFromPath(mdPath) {
  const raw = await fs.readFile(mdPath, "utf8");
  const { front } = parseFrontmatter(raw);
  if (!front.name) throw new Error("Manifest missing name in frontmatter");
  return computeSkillKey(raw, front.name);
}

async function loadBacktestDigest(backtestPath, strategyName) {
  if (!backtestPath) return null;
  const raw = await fs.readFile(backtestPath, "utf8");
  const data = JSON.parse(raw);
  return computeStrategyDigest({
    strategy: data.strategy || strategyName,
    range: data.range,
    metrics: data.metrics,
    replay: data.replay ? { tradeCount: data.replay?.trades?.length ?? 0 } : undefined,
    simulation_only: true,
  });
}

/**
 * Attest strategy fingerprint via TWAK self-custody signing + BSC testnet tx.
 */
export async function attest(params) {
  const mode = getAttestMode();
  const twak = await initTwakAutonomous();
  const logPath = getBehaviorLogPath();

  const strategyDigest =
    params.strategyDigest ||
    (await loadBacktestDigest(params.backtestPath, params.strategyName)) ||
    `scan:${params.digest}`;

  await appendTwakLog({
    status: "attest_start",
    mode,
    provider: twak.provider,
    address: twak.address,
    strategyKey: params.strategyKey,
    score: params.score,
    digest: strategyDigest,
    fingerprint: twakConfigFingerprint(twak.session),
  });

  if (mode === "simulate") {
    const fakeTx = keccak256(stringToBytes(`${params.strategyKey}:${params.score}:${strategyDigest}:simulate`));
    const result = {
      mode: "simulate",
      digest: strategyDigest,
      txHash: fakeTx,
      strategyKey: params.strategyKey,
      score: params.score,
      note: "Simulation only — set AGENT_PRIVATE_KEY and ATTEST_MODE=live for BSC testnet tx",
    };
    await fs.appendFile(logPath, JSON.stringify({ type: "attest", ts: new Date().toISOString(), ...result }) + "\n", "utf8");
    await appendTwakLog({ status: "attest_simulated", txHash: fakeTx });
    return result;
  }

  const attestation = await attestStrategyDigest({
    strategyDigest,
    strategyName: params.strategyName || "strategy",
    score: params.score,
    strategyKey: params.strategyKey,
  });

  const result = {
    ...attestation,
    strategyKey: params.strategyKey,
    score: params.score,
  };

  await fs.appendFile(logPath, JSON.stringify({ type: "attest", ts: new Date().toISOString(), ...result }) + "\n", "utf8");
  await appendTwakLog({ status: "attest_confirmed", txHash: attestation.txHash, explorer: attestation.explorer });
  await saveAttestationToAgentState(attestation.explorer, attestation.txHash);
  return result;
}

async function main() {
  const { target, score, backtestPath } = parseArgs(process.argv);
  if (!target || Number.isNaN(score)) {
    console.error("Usage: node attest.js --strategy <name> [--score 85] [--backtest path/to/result.json]");
    console.error("  ATTEST_MODE=live when AGENT_PRIVATE_KEY is set (default live with key, simulate without)");
    process.exit(1);
  }
  if (score < 0 || score > 100 || !Number.isInteger(score)) {
    console.error("score must be integer 0–100");
    process.exit(1);
  }

  const logPath = getBehaviorLogPath();
  const strategyKey = target.startsWith("@")
    ? await strategyKeyFromPath(target.slice(1))
    : await findStrategyKeyByName(logPath, target);

  if (!strategyKey) {
    console.error("Unknown strategy. Run npm run strategy:all first or pass --strategy @/path/to/SKILL.md");
    process.exit(1);
  }

  const digest = await readLastScanDigest(logPath);
  const defaultBacktest = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../backtest_results",
    `${target.toLowerCase()}_BNB.json`
  );
  const btPath = backtestPath || defaultBacktest;

  const result = await attest({
    strategyKey,
    score,
    digest,
    strategyName: target,
    backtestPath: await fs.access(btPath).then(() => btPath).catch(() => undefined),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
