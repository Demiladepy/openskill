#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchHistoricalOhlcv, getDefaultPairs } from "./cmcDataFetcher.js";
import { loadProjectEnv } from "./lib/loadEnv.js";
import { getBehaviorLogPath } from "./lib/logPath.js";

loadProjectEnv();

/** @typedef {{ timestamp: string, open: number, high: number, low: number, close: number, volume: number }} OhlcvBar */

const FAST_MA = Number(process.env.CMC_FAST_MA || "10");
const SLOW_MA = Number(process.env.CMC_SLOW_MA || "30");

/**
 * @param {number[]} closes
 * @param {number} period
 */
function sma(closes, period) {
  const out = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    out[i] = sum / period;
  }
  return out;
}

/**
 * @param {OhlcvBar[]} bars
 * @param {{ fast?: number, slow?: number, symbol: string, convert: string }} cfg
 */
export function runMaCrossover(bars, cfg) {
  const fastPeriod = cfg.fast ?? FAST_MA;
  const slowPeriod = cfg.slow ?? SLOW_MA;
  if (bars.length < slowPeriod + 2) {
    throw new Error(`Need at least ${slowPeriod + 2} bars, got ${bars.length}`);
  }

  const closes = bars.map((b) => b.close);
  const fast = sma(closes, fastPeriod);
  const slow = sma(closes, slowPeriod);

  /** @type {Array<Record<string, unknown>>} */
  const decisions = [];
  /** @type {Array<Record<string, unknown>>} */
  const entries = [];
  /** @type {Array<Record<string, unknown>>} */
  const exits = [];

  let position = null;
  /** @type {number[]} */
  const tradeReturns = [];
  /** @type {number[]} */
  const equityCurve = [1];

  for (let i = 1; i < bars.length; i++) {
    if (fast[i] == null || slow[i] == null || fast[i - 1] == null || slow[i - 1] == null) continue;

    const crossUp = fast[i - 1] <= slow[i - 1] && fast[i] > slow[i];
    const crossDown = fast[i - 1] >= slow[i - 1] && fast[i] < slow[i];
    const bar = bars[i];

    if (crossUp && !position) {
      position = { entryIndex: i, entryPrice: bar.close, entryTs: bar.timestamp };
      const decision = {
        type: "backtest_decision",
        ts: bar.timestamp,
        strategy: "ma-crossover",
        symbol: cfg.symbol,
        convert: cfg.convert,
        signal: "entry",
        price: bar.close,
        fastMa: Number(fast[i].toFixed(6)),
        slowMa: Number(slow[i].toFixed(6)),
        note: `Fast MA(${fastPeriod}) crossed above slow MA(${slowPeriod})`,
      };
      decisions.push(decision);
      entries.push({ ...decision });
    }

    if (crossDown && position) {
      const ret = (bar.close - position.entryPrice) / position.entryPrice;
      tradeReturns.push(ret);
      equityCurve.push(equityCurve.at(-1) * (1 + ret));

      const decision = {
        type: "backtest_decision",
        ts: bar.timestamp,
        strategy: "ma-crossover",
        symbol: cfg.symbol,
        convert: cfg.convert,
        signal: "exit",
        price: bar.close,
        fastMa: Number(fast[i].toFixed(6)),
        slowMa: Number(slow[i].toFixed(6)),
        pnlPct: Number((ret * 100).toFixed(4)),
        note: `Fast MA(${fastPeriod}) crossed below slow MA(${slowPeriod})`,
      };
      decisions.push(decision);
      exits.push({ ...decision });
      position = null;
    }
  }

  const totalReturn = equityCurve.at(-1) - 1;
  const sharpe = approximateSharpe(tradeReturns);

  const spec = {
    type: "backtest_spec",
    ts: new Date().toISOString(),
    strategy: "ma-crossover",
    symbol: cfg.symbol,
    convert: cfg.convert,
    params: { fastMa: fastPeriod, slowMa: slowPeriod, bars: bars.length },
    entries,
    exits,
    metrics: {
      trades: tradeReturns.length,
      totalReturnPct: Number((totalReturn * 100).toFixed(4)),
      hypotheticalPnlPct: Number((totalReturn * 100).toFixed(4)),
      sharpeApprox: sharpe,
      winRatePct:
        tradeReturns.length === 0
          ? 0
          : Number(((tradeReturns.filter((r) => r > 0).length / tradeReturns.length) * 100).toFixed(2)),
    },
  };

  return { decisions, spec };
}

/** @param {number[]} tradeReturns */
function approximateSharpe(tradeReturns) {
  if (tradeReturns.length < 2) return 0;
  const mean = tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length;
  const variance =
    tradeReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (tradeReturns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return Number(((mean / std) * Math.sqrt(252)).toFixed(4));
}

/**
 * @param {Array<Record<string, unknown>>} lines
 * @param {string} [logPath]
 */
export async function appendBehaviorLog(lines, logPath = getBehaviorLogPath()) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const payload = lines.map((line) => JSON.stringify(line)).join("\n") + "\n";
  await fs.appendFile(logPath, payload, "utf8");
  return logPath;
}

function parseArgs(argv) {
  let symbol = process.env.CMC_SYMBOL || "BNB";
  let convert = process.env.CMC_CONVERT || "USDT";
  let all = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--symbol" && argv[i + 1]) symbol = argv[++i];
    else if (argv[i] === "--convert" && argv[i + 1]) convert = argv[++i];
    else if (argv[i] === "--all") all = true;
  }
  return { symbol, convert, all };
}

async function runOne(symbol, convert) {
  const bars = await fetchHistoricalOhlcv({ symbol, convert });
  const { decisions, spec } = runMaCrossover(bars, { symbol, convert });
  const logPath = await appendBehaviorLog([...decisions, spec]);
  return { symbol, convert, bars: bars.length, spec, logPath };
}

async function main() {
  const { symbol, convert, all } = parseArgs(process.argv);
  const results = [];

  if (all) {
    for (const pair of getDefaultPairs()) {
      results.push(await runOne(pair.symbol, pair.convert));
    }
  } else {
    results.push(await runOne(symbol, convert));
  }

  console.log(JSON.stringify({ results }, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
