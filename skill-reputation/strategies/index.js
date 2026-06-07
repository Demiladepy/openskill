#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMarketBundle } from "../src/cmcDataClient.js";
import { runStrategyBacktest } from "../src/backtestEngine.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import MomentumMerger from "./momentumMerger.js";
import SentimentDivergence from "./sentimentDivergence.js";
import RegimeDetector from "./regimeDetector.js";

loadProjectEnv();

const STRATEGIES = {
  momentum: MomentumMerger,
  sentiment: SentimentDivergence,
  regime: RegimeDetector,
};

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_DIR = path.join(ROOT, "backtest_results");

function parseArgs(argv) {
  const positional = argv[2];
  const opts = { from: "2026-06-01", to: "2026-06-21", symbol: "BNB", convert: "USDT", all: false };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--from" && argv[i + 1]) opts.from = argv[++i];
    else if (argv[i] === "--to" && argv[i + 1]) opts.to = argv[++i];
    else if (argv[i] === "--symbol" && argv[i + 1]) opts.symbol = argv[++i];
    else if (argv[i] === "--all") opts.all = true;
  }
  return { name: positional, ...opts };
}

async function runOne(name, opts) {
  const StrategyClass = STRATEGIES[name];
  if (!StrategyClass) throw new Error(`Unknown strategy: ${name}. Use: ${Object.keys(STRATEGIES).join(", ")}`);

  const strategy = new StrategyClass();
  const market = await fetchMarketBundle({ symbol: opts.symbol, convert: opts.convert, barCount: 120 });
  const result = await runStrategyBacktest(strategy, market, { startDate: opts.from, endDate: opts.to });

  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const replayPath = path.join(RESULTS_DIR, `${name}_replay_data.json`);
  const specPath = path.join(RESULTS_DIR, `${name}_spec.json`);

  await fs.writeFile(replayPath, JSON.stringify({ replay: result.replay, metrics: result.metrics }, null, 2));
  await fs.writeFile(specPath, JSON.stringify(strategy.exportSpec(), null, 2));

  console.log(JSON.stringify({ name, replayPath, specPath, metrics: result.metrics, mockWarning: market.meta.mockWarning }, null, 2));
  return { name, replayPath, specPath, result, strategy };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.name && !opts.all) {
    console.error("Usage: npm run strategy -- <momentum|sentiment|regime> -- --from 2026-06-01 --to 2026-06-21");
    process.exit(1);
  }

  if (opts.all) {
    for (const name of Object.keys(STRATEGIES)) {
      await runOne(name, opts);
    }
    return;
  }

  await runOne(opts.name, opts);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

export { STRATEGIES, runOne };
