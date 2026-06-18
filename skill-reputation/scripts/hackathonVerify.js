#!/usr/bin/env node
/**
 * Final submission verification — one command checklist.
 * npm run verify
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import { validateCmcApiKey, useMock } from "../src/cmcDataClient.js";
import { validateSkillsDirectory } from "../marketplace/validator.js";
import { generateReplayReport } from "../replay/pnlReplay.js";
import { readAttestations } from "../src/lib/behaviorLog.js";

loadProjectEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = ["BTC", "ETH", "BNB"];
const STRATEGIES = ["momentum", "sentiment", "regime"];

const checklist = [];

function check(name, ok, detail, severity = "required") {
  checklist.push({ name, ok, detail, severity });
  return ok;
}

async function readJson(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

async function verifyBacktests() {
  let anySharpeAbove1 = false;
  let totalTrades = 0;
  let liveData = false;

  for (const strat of STRATEGIES) {
    for (const asset of ASSETS) {
      const p = path.join(ROOT, "backtest_results", `${strat}_${asset}.json`);
      const data = await readJson(p);
      if (!data) {
        check(`backtest_${strat}_${asset}`, false, "missing — run npm run strategy:all");
        continue;
      }
      const m = data.metrics || {};
      const trades = m.trades ?? 0;
      totalTrades += trades;
      if ((m.sharpeRatio ?? 0) > 1) anySharpeAbove1 = true;
      if (data.dataSource === "coinmarketcap-data-api" || data.dataSource === "cmc-mixed") liveData = true;
      check(
        `backtest_${strat}_${asset}`,
        trades > 0 || strat === "sentiment",
        `${trades} trades, Sharpe ${m.sharpeRatio ?? 0}`,
        "required"
      );
    }
  }

  check("backtest_any_sharpe_gt_1", anySharpeAbove1, anySharpeAbove1 ? "yes" : "run live CMC or tune mock", "recommended");
  check("backtest_live_cmc_data", liveData || useMock(), liveData ? "live CMC detected" : "mock only — set CMC_API_KEY", "recommended");
  check("backtest_total_trades", totalTrades > 5, `${totalTrades} total trades`, "recommended");
}

async function verifyOnChain() {
  const attestations = await readAttestations();
  const live = attestations.filter((a) => a.mode === "live" && a.explorer);
  check(
    "live_attestation_tx",
    live.length > 0,
    live[0]?.explorer || "set AGENT_PRIVATE_KEY + npm run attest",
    "recommended"
  );

  const agentState = await readJson(path.join(ROOT, "bnbagent", "agent_state.json"));
  check(
    "erc8004_registration",
    agentState?.mode === "live" && agentState?.transactionHash,
    agentState?.explorer || agentState?.transactionHash || "python bnbagent/register_agent.py --live",
    "recommended"
  );
}

async function verifyArtifacts() {
  const examples = await fs.readdir(path.join(ROOT, "examples")).catch(() => []);
  const stale = examples.filter((f) => f.endsWith(".cmcskill.zip"));
  check("no_stale_cmcskill_zip", stale.length === 0, stale.join(", ") || "ok");
  check(
    "skills_export_zip",
    examples.some((f) => f.startsWith("cmc-strategy-")),
    examples.filter((f) => f.endsWith(".zip")).join(", ") || "npm run export:skills"
  );

  const skills = await validateSkillsDirectory(path.join(ROOT, "skills"));
  check("cmc_skills_format", skills.ok, "skills/cmc-strategy-*/SKILL.md");

  for (const strat of STRATEGIES) {
    const spec = await readJson(path.join(ROOT, "backtest_results", `${strat}_BTC_spec.json`));
    check(
      `strategy_spec_${strat}`,
      spec?.schema === "cmc-strategy-forge/1.0",
      spec ? "PositionSight-style spec present" : "run strategy:all"
    );
  }
}

async function main() {
  console.log("=== CMC Strategy Forge — Final Verify ===\n");

  const cmc = await validateCmcApiKey({ required: false });
  check("cmc_api_key", cmc.ok || cmc.skipped || useMock(), cmc.ok ? "valid" : "mock or missing key");

  await verifyBacktests();
  await verifyArtifacts();
  await verifyOnChain();

  const replay = await generateReplayReport({ from: "2026-03-01", to: "2026-06-01" });
  check("replay_html", !!replay.htmlPath, replay.htmlPath);

  const manifest = {
    project: "CMC Strategy Forge",
    checklist,
    submission_files: [
      "README.md",
      "skill-reputation/DEMO.md",
      "skill-reputation/backtest_results/*.json",
      "skill-reputation/skills/cmc-strategy-*/SKILL.md",
      "skill-reputation/examples/cmc-strategy-skills.zip",
      "skill-reputation/replay/output/replay_report.html",
    ],
    manual_steps_remaining: [
      "Set CMC_API_KEY and re-run strategy:all with live data",
      "Set AGENT_PRIVATE_KEY, npm run attest, paste BscScan link in README",
      "python bnbagent/register_agent.py --live for ERC-8004 tx",
      "Record demo video per DEMO.md",
      "Push to GitHub and submit DoraHacks BUIDL",
    ],
    generated_at: new Date().toISOString(),
  };

  const outPath = path.join(ROOT, "replay", "output", "hackathon_checklist.json");
  await fs.writeFile(outPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));

  const failedRequired = checklist.filter((c) => !c.ok && c.severity === "required");
  if (failedRequired.length) {
    console.warn(`\n${failedRequired.length} required check(s) failed.`);
    process.exitCode = 1;
  } else {
    const recommended = checklist.filter((c) => !c.ok && c.severity === "recommended");
    if (recommended.length) {
      console.warn(`\n${recommended.length} recommended check(s) for full prize eligibility.`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
