import { fetchMarketBundle } from "../../src/cmcDataClient.js";
import { enrichMarketBundle } from "../../src/cmcSignals.js";
import { runBacktest } from "../../src/backtestEngine.js";
import { loadProjectEnv } from "../../src/lib/loadEnv.js";
import Momentum from "./strategies/momentum.js";
import Sentiment from "./strategies/sentiment.js";
import Regime from "./strategies/regime.js";

loadProjectEnv();

const STRATEGIES = {
  momentum: Momentum,
  sentiment: Sentiment,
  regime: Regime,
};

/**
 * @param {string} name
 * @param {string} fromDate
 * @param {string} toDate
 * @param {{ symbol?: string, convert?: string }} opts
 */
export async function runStrategy(name, fromDate, toDate, opts = {}) {
  const StrategyClass = STRATEGIES[name];
  if (!StrategyClass) {
    throw new Error(`Unknown strategy "${name}". Use: ${Object.keys(STRATEGIES).join(", ")}`);
  }

  const strategy = new StrategyClass();
  const raw = await fetchMarketBundle({
    symbol: opts.symbol || "BNB",
    convert: opts.convert || "USDT",
    barCount: 120,
  });
  const market = await enrichMarketBundle(raw);

  const result = await runBacktest(strategy, fromDate, toDate, {
    marketBundle: market,
    symbol: opts.symbol || "BNB",
    convert: opts.convert || "USDT",
  });

  return {
    ...result,
    mockWarning: market.meta?.mockWarning || null,
    toCSV() {
      return backtestToCsv(result);
    },
  };
}

function backtestToCsv(result) {
  const header = "timestamp,action,price,signal,confidence,pnlPct,equity";
  const rows = (result.trades || result.replay || []).map((r) =>
    [
      r.timestamp,
      r.action,
      r.price ?? "",
      r.signal ?? "",
      r.confidence ?? "",
      r.pnlPct ?? "",
      r.equity ?? "",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export { STRATEGIES };
