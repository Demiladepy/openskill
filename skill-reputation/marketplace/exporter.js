#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import { computeStrategyKey } from "../src/lib/strategyKey.js";
import { readLatestScan } from "../src/lib/behaviorLog.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import { runOne } from "../strategies/index.js";

loadProjectEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function digestShort(digest) {
  return String(digest).replace(/^0x/, "").slice(0, 8);
}

function buildSkillMarkdown(spec, strategyKey, digest, scanMeta) {
  const perf = spec.backtest_performance || {};
  return `---
name: ${spec.name}
version: ${spec.version || "1.0.0"}
strategy_type: ${spec.strategy_type || "cmc-quant"}
cmc_requirements:
  indicators: ${JSON.stringify(spec.cmc_requirements?.indicators || [])}
  data_frequency: ${spec.cmc_requirements?.data_frequency || "daily"}
  min_history_days: ${spec.cmc_requirements?.min_history_days || 90}
risk_profile: ${spec.risk_profile || "moderate"}
backtest_period:
  from: ${scanMeta.from || "2026-06-01"}
  to: ${scanMeta.to || "2026-06-21"}
backtest_performance:
  sharpe: ${perf.sharpeRatio ?? 0}
  max_drawdown: ${perf.maxDrawdownPct ?? 0}%
  total_return: ${perf.totalReturnPct ?? 0}%
strategy_key: ${strategyKey}
digest: ${digest}
simulation_only: true
live_trading: false
data_source: CoinMarketCap Data API
---

# ${spec.name}

CoinMarketCap Strategy Skill — **backtestable spec** for Skills Marketplace (Track 2).

## Trading logic
${(spec.rules_plain_english || []).map((r) => `- ${r}`).join("\n")}

## Parameters
${JSON.stringify(spec.params || {}, null, 2)}

## Entry / exit
- Entry: ${(spec.entry_rules || []).join("; ") || "See rules above"}
- Exit: ${(spec.exit_rules || []).join("; ") || "See rules above"}

## Fingerprint
- strategyKey: \`${strategyKey}\`
- digest: \`${digest}\`
`;
}

async function zipDirectory(sourceDir, outPath) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

const JS_MAP = {
  momentum: "momentumMerger.js",
  sentiment: "sentimentDivergence.js",
  regime: "regimeDetector.js",
  "momentum merger": "momentumMerger.js",
  "sentiment divergence": "sentimentDivergence.js",
  "regime detector": "regimeDetector.js",
};

function resolveStrategySlug(name) {
  const n = name.toLowerCase();
  if (n.includes("momentum")) return "momentum";
  if (n.includes("sentiment")) return "sentiment";
  if (n.includes("regime")) return "regime";
  return n.replace(/\s+/g, "-");
}

export async function exportFromScan(opts = {}) {
  const scan = await readLatestScan();
  if (!scan) throw new Error("No scan found in behavior-log.jsonl. Run: npm run registry");

  const strategies = scan.snapshot?.strategies || scan.snapshot?.skills || [];
  const exports = [];

  for (const entry of strategies) {
    const slug = resolveStrategySlug(entry.name);
    const jsFile = JS_MAP[slug] || JS_MAP[entry.name?.toLowerCase()];
    if (!jsFile) continue;

    const { result, strategy } = await runOne(slug, {
      from: opts.from || "2026-06-01",
      to: opts.to || "2026-06-21",
    });

    const spec = strategy.exportSpec();
    spec.strategy_type = spec.strategy_type || slug;
    const body = JSON.stringify(spec, null, 2);
    const strategyKey = entry.skillKey || entry.strategyKey || computeStrategyKey(body, spec.name);
    const digest = scan.digest || computeStrategyKey(body + JSON.stringify(result.metrics), spec.name);

    const staging = path.join(ROOT, "examples", `.staging-${slug}`);
    await fs.rm(staging, { recursive: true, force: true });
    await fs.mkdir(staging, { recursive: true });

    await fs.writeFile(
      path.join(staging, "SKILL.md"),
      buildSkillMarkdown(spec, strategyKey, digest, { from: opts.from, to: opts.to })
    );
    await fs.writeFile(path.join(staging, "strategy.spec.json"), body);
    await fs.writeFile(
      path.join(staging, "backtest_results.json"),
      JSON.stringify({ metrics: result.metrics, replay: result.replay, rules: result.rulesPlainEnglish }, null, 2)
    );

    const jsSrc = path.join(ROOT, "strategies", jsFile);
    await fs.copyFile(jsSrc, path.join(staging, jsFile));

    const safeName = spec.name.toLowerCase().replace(/\s+/g, "-");
    const outZip = path.join(ROOT, "examples", `${safeName}-${digestShort(digest)}.cmcskill.zip`);
    await zipDirectory(staging, outZip);
    await fs.rm(staging, { recursive: true, force: true });

    exports.push({ outZip, strategyKey, digest, name: spec.name });
  }

  return { scanDigest: scan.digest, exports };
}

export async function exportCmcSkill(strategyName, opts = {}) {
  const { result, strategy } = await runOne(strategyName, {
    from: opts.from || "2026-06-01",
    to: opts.to || "2026-06-21",
    symbol: opts.symbol || "BNB",
    convert: opts.convert || "USDT",
  });

  const spec = strategy.exportSpec();
  const body = JSON.stringify(spec, null, 2);
  const strategyKey = computeStrategyKey(body, spec.name);
  const digest = computeStrategyKey(body + JSON.stringify(result.metrics), spec.name);

  const staging = path.join(ROOT, "examples", `.staging-${strategyName}`);
  await fs.rm(staging, { recursive: true, force: true });
  await fs.mkdir(staging, { recursive: true });

  await fs.writeFile(
    path.join(staging, "SKILL.md"),
    buildSkillMarkdown(spec, strategyKey, digest, { from: opts.from, to: opts.to })
  );
  await fs.writeFile(path.join(staging, "strategy.spec.json"), body);
  await fs.writeFile(
    path.join(staging, "backtest_results.json"),
    JSON.stringify({ metrics: result.metrics, replay: result.replay }, null, 2)
  );

  const jsSrc = path.join(ROOT, "strategies", JS_MAP[strategyName] || `${strategyName}.js`);
  await fs.copyFile(jsSrc, path.join(staging, path.basename(jsSrc)));

  const safeName = spec.name.toLowerCase().replace(/\s+/g, "-");
  const outZip = path.join(ROOT, "examples", `${safeName}-${digestShort(digest)}.cmcskill.zip`);
  await zipDirectory(staging, outZip);
  await fs.rm(staging, { recursive: true, force: true });

  return { outZip, strategyKey, digest, spec };
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--from-scan" || !arg) {
    const out = await exportFromScan();
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  const out = await exportCmcSkill(arg);
  console.log(JSON.stringify(out, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
