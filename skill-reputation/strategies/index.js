#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMarketBundle, useMock } from "../src/cmcDataClient.js";
import { enrichMarketBundle } from "../src/cmcSignals.js";
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

const ASSETS = ["BTC", "ETH", "BNB"];
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_DIR = path.join(ROOT, "backtest_results");

function parseArgs(argv) {
  const positional = argv[2];
  const opts = {
    from: "2026-03-01",
    to: "2026-06-01",
    symbol: "BNB",
    convert: "USDT",
    all: false,
    barCount: 180,
  };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--from" && argv[i + 1]) opts.from = argv[++i];
    else if (argv[i] === "--to" && argv[i + 1]) opts.to = argv[++i];
    else if (argv[i] === "--symbol" && argv[i + 1]) opts.symbol = argv[++i];
    else if (argv[i] === "--all") opts.all = true;
  }
  return { name: positional, ...opts };
}

function printSummaryTable(rows) {
  const header = ["Strategy", "Asset", "Sharpe", "MaxDD%", "Trades", "WinRate%", "Return%"];
  const colWidths = header.map((h) => h.length);
  for (const r of rows) {
    const cells = [r.strategy, r.asset, r.sharpe, r.maxDd, r.trades, r.winRate, r.ret];
    cells.forEach((c, i) => {
      colWidths[i] = Math.max(colWidths[i], String(c).length);
    });
  }
  const line = (cells) => cells.map((c, i) => String(c).padEnd(colWidths[i])).join("  ");
  console.log("\n" + line(header));
  console.log(line(header.map((h) => "-".repeat(h.length))));
  for (const r of rows) {
    console.log(
      line([
        r.strategy,
        r.asset,
        r.sharpe,
        r.maxDd,
        r.trades,
        r.winRate,
        r.ret,
      ])
    );
  }
  console.log("");
}

async function runOne(name, opts) {
  const StrategyClass = STRATEGIES[name];
  if (!StrategyClass) throw new Error(`Unknown strategy: ${name}. Use: ${Object.keys(STRATEGIES).join(", ")}`);

  const strategy = new StrategyClass();
  const raw = await fetchMarketBundle({
    symbol: opts.symbol,
    convert: opts.convert,
    barCount: opts.barCount || 180,
  });
  const market = await enrichMarketBundle(raw);
  const result = await runStrategyBacktest(strategy, market, { startDate: opts.from, endDate: opts.to });

  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const assetSuffix = opts.symbol;
  const outPath = path.join(RESULTS_DIR, `${name}_${assetSuffix}.json`);
  const replayPath = path.join(RESULTS_DIR, `${name}_replay_data.json`);
  const specPath = path.join(RESULTS_DIR, `${name}_spec.json`);

  const payload = {
    strategy: name,
    asset: opts.symbol,
    range: result.range,
    metrics: result.metrics,
    equityCurve: result.equityCurve,
    replay: result.replay,
    dataSource: market.meta?.dataSource,
    cmcSignalSource: market.cmcSignals?.source,
    mockWarning: market.meta?.mockWarning,
  };

  await fs.writeFile(outPath, JSON.stringify(payload, null, 2));
  if (opts.symbol === "BNB") {
    await fs.writeFile(replayPath, JSON.stringify({ replay: result.replay, metrics: result.metrics }, null, 2));
    await fs.writeFile(specPath, JSON.stringify(strategy.exportSpec(), null, 2));
  }

  return {
    strategy: name,
    asset: opts.symbol,
    sharpe: result.metrics.sharpeRatio,
    maxDd: result.metrics.maxDrawdownPct,
    trades: result.metrics.trades,
    winRate: result.metrics.winRatePct,
    ret: result.metrics.totalReturnPct,
    outPath,
    mockWarning: market.meta?.mockWarning,
  };
}

async function main() {
  const opts = parseArgs(process.argv);

  if (useMock()) {
    console.warn("⚠ CMC_USE_MOCK=1 or no CMC_API_KEY — using mock data. Set CMC_API_KEY for live results.\n");
  } else {
    console.log("Using CoinMarketCap Data API (live)\n");
  }

  if (!opts.name && !opts.all) {
    console.error("Usage: npm run strategy -- <momentum|sentiment|regime> -- --from 2026-03-01 --to 2026-06-01");
    console.error("       npm run strategy:all");
    process.exit(1);
  }

  const summary = [];

  if (opts.all) {
    for (const name of Object.keys(STRATEGIES)) {
      for (const symbol of ASSETS) {
        const row = await runOne(name, { ...opts, symbol });
        summary.push(row);
        console.log(`✓ ${name} / ${symbol}: ${row.trades} trades, Sharpe ${row.sharpe}, DD ${row.maxDd}%`);
      }
    }
    printSummaryTable(summary);
    return;
  }

  const row = await runOne(opts.name, opts);
  console.log(JSON.stringify(row, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

export { STRATEGIES, runOne, ASSETS };
