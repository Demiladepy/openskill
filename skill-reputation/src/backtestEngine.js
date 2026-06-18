/**

 * Track 2 backtest engine — simulation only, no live execution.

 */

import { sharpeFromReturns, sharpeFromEquityCurve, round } from "../cli-skill/scripts/quant/sharpe.js";

import { maxDrawdownFromEquity } from "../cli-skill/scripts/quant/maxdd.js";

import { fetchMarketBundle } from "./cmcDataClient.js";
import { enrichMarketBundle } from "./cmcSignals.js";



const SLIPPAGE = 0.001; // 0.1% per leg

const FEE = 0.001; // 0.1% per leg (0.2% round-trip)

const CRYPTO_PERIODS_PER_YEAR = 365;



/**

 * @param {Array<{ timestamp: string, close: number, high?: number }>} bars

 * @param {Array<{ timestamp: string, signal: string, confidence?: number, strength?: number }>} signals

 * @param {{ initialCapital?: number, positionSizePct?: number, trailingStopPct?: number }} opts

 */

export function runBacktestSimulation(bars, signals, opts = {}) {

  const capital0 = opts.initialCapital ?? 10000;

  const positionSizePct = (opts.positionSizePct ?? 100) / 100;

  const trailingStopPct = opts.trailingStopPct ?? 0;

  const signalByTs = new Map(signals.map((s) => [normalizeTs(s.timestamp), s]));



  let cash = capital0;

  let position = null;

  /** @type {Array<Record<string, unknown>>} */

  const replay = [];

  /** @type {number[]} */

  const tradeReturns = [];

  /** @type {{ date: string, equity: number, position: string }[]} */

  const equityCurve = [];

  /** @type {{ entryTs: string, exitTs: string, days: number }[]} */

  const tradeDurations = [];



  function closePosition(bar, reason) {

    if (!position) return;

    const gross = position.units * (bar.close * (1 - SLIPPAGE));

    const fee = gross * FEE;

    const proceeds = gross - fee;

    cash += proceeds;

    const ret = (proceeds - position.spend) / position.spend;

    tradeReturns.push(ret);

    const entryMs = new Date(position.entryTs).getTime();

    const exitMs = new Date(bar.timestamp).getTime();

    tradeDurations.push({

      entryTs: position.entryTs,

      exitTs: bar.timestamp,

      days: Math.max(1, Math.round((exitMs - entryMs) / 86400000)),

    });

    replay.push({

      timestamp: bar.timestamp,

      action: "exit",

      price: bar.close,

      signal: reason,

      pnlPct: ret * 100,

      equity: cash,

    });

    position = null;

  }



  for (const bar of bars) {

    const sig = signalByTs.get(normalizeTs(bar.timestamp));

    const px = bar.close * (1 + SLIPPAGE);



    if (position && trailingStopPct > 0) {

      position.highWaterMark = Math.max(position.highWaterMark ?? position.entryPrice, bar.high ?? bar.close);

      const stopPx = position.highWaterMark * (1 - trailingStopPct / 100);

      if (bar.close <= stopPx) {

        closePosition(bar, "trailing_stop");

      }

    }



    if (sig?.signal === "buy" && !position) {

      const minConf = opts.minBuyConfidence ?? 0.55;

      if ((sig.confidence ?? sig.strength ?? 1) >= minConf) {

      const spend = cash * positionSizePct;

      const fee = spend * FEE;

      const units = (spend - fee) / px;

      position = {

        entryTs: bar.timestamp,

        entryPrice: px,

        units,

        spend,

        highWaterMark: bar.close,

      };

      cash -= spend;

      replay.push({

        timestamp: bar.timestamp,

        action: "entry",

        price: px,

        signal: sig.signal,

        confidence: sig.confidence ?? sig.strength ?? null,

        equity: cash + units * bar.close,

      });

      }

    }



    if (sig?.signal === "sell" && position) {

      closePosition(bar, sig.signal);

    }



    const mark = cash + (position ? position.units * bar.close : 0);

    equityCurve.push({

      date: bar.timestamp,

      equity: round(mark, 2),

      position: position ? "long" : "flat",

    });

  }



  if (position && bars.length) {

    closePosition(bars.at(-1), "end_of_period");

  }



  const finalEquity = equityCurve.at(-1)?.equity ?? capital0;

  const totalReturnPct = ((finalEquity - capital0) / capital0) * 100;

  const sharpeFromTrades = sharpeFromReturns(tradeReturns, CRYPTO_PERIODS_PER_YEAR);

  const sharpeFromEquity = sharpeFromEquityCurve(equityCurve, CRYPTO_PERIODS_PER_YEAR);

  const sharpe =

    tradeReturns.length >= 2

      ? sharpeFromTrades

      : sharpeFromEquity !== 0

        ? sharpeFromEquity

        : sharpeFromTrades;

  const winRatePct =

    tradeReturns.length === 0 ? 0 : (tradeReturns.filter((r) => r > 0).length / tradeReturns.length) * 100;



  const grossProfit = tradeReturns.filter((r) => r > 0).reduce((a, r) => a + r, 0);

  const grossLoss = Math.abs(tradeReturns.filter((r) => r < 0).reduce((a, r) => a + r, 0));

  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 999 : 0) : round(grossProfit / grossLoss);

  const avgTradeDurationDays =

    tradeDurations.length === 0

      ? 0

      : round(tradeDurations.reduce((a, t) => a + t.days, 0) / tradeDurations.length, 1);



  const equityValues = equityCurve.map((e) => e.equity);



  return {

    metrics: {

      totalReturnPct: round(totalReturnPct),

      sharpeRatio: sharpe,

      maxDrawdownPct: maxDrawdownFromEquity(equityValues.length ? equityValues : [capital0]),

      winRatePct: round(winRatePct),

      trades: tradeReturns.length,

      profitFactor,

      avgTradeDurationDays,

    },

    replay,

    equity: equityValues,

    equityCurve,

    tradeReturns,

  };

}



/**

 * @param {import('../strategies/baseStrategy.js').BaseStrategy} strategy

 * @param {unknown} marketBundle

 * @param {{ startDate: string, endDate: string }} range

 */

export async function runStrategyBacktest(strategy, marketBundle, range) {

  const result = strategy.backtest(marketBundle, range.startDate, range.endDate);

  const bars = filterBarsByDate(marketBundle.ohlcv || [], range.startDate, range.endDate);

  const sim = runBacktestSimulation(bars, result.signals || [], {

    positionSizePct: strategy.params?.positionSizePct ?? 100,

    trailingStopPct: strategy.params?.trailingStopPct ?? 0,

    minBuyConfidence: strategy.params?.minBuyConfidence ?? 0.55,

  });



  const payload = {

    strategy: strategy.name,

    symbol: marketBundle.meta?.symbol,

    range: { startDate: range.startDate, endDate: range.endDate },

    metrics: sim.metrics,

    replay: sim.replay,

    equityCurve: sim.equityCurve,

    trades: sim.replay,

    rulesPlainEnglish: result.rulesPlainEnglish || [],

    cmcEndpointsUsed: result.cmcEndpointsUsed || [],

    dataSource: marketBundle.meta?.dataSource,

  };



  strategy.lastBacktest = payload;

  return payload;

}



/**

 * High-level backtest entry for CLI skills and agents.

 */

export async function runBacktest(strategy, fromDate, toDate, options = {}) {

  let market = options.marketBundle;

  if (!market) {

    const raw = await fetchMarketBundle({

      symbol: options.symbol ?? "BNB",

      convert: options.convert ?? "USDT",

      barCount: options.barCount ?? 120,

    });

    market = await enrichMarketBundle(raw);

  } else if (!market.cmcSignals) {

    market = await enrichMarketBundle(market);

  }



  const payload = await runStrategyBacktest(strategy, market, {

    startDate: fromDate,

    endDate: toDate,

  });



  return {

    strategy: payload.strategy,

    symbol: payload.symbol,

    range: payload.range,

    metrics: payload.metrics,

    trades: payload.trades,

    equityCurve: payload.equityCurve,

    replay: payload.replay,

    rulesPlainEnglish: payload.rulesPlainEnglish,

    cmcEndpointsUsed: payload.cmcEndpointsUsed,

  };

}



export function toJobResult(backtestOutput, extras = {}) {

  const metrics = /** @type {Record<string, number>} */ (backtestOutput.metrics || {});

  const range = /** @type {{ startDate?: string, endDate?: string }} */ (backtestOutput.range || {});

  return {

    version: "1.0",

    strategy: backtestOutput.strategy,

    period: { from: range.startDate, to: range.endDate },

    metrics: {

      sharpe_ratio: metrics.sharpeRatio ?? 0,

      max_drawdown_pct: metrics.maxDrawdownPct ?? 0,

      total_return_pct: metrics.totalReturnPct ?? 0,

      win_rate_pct: metrics.winRatePct ?? 0,

      trade_count: metrics.trades ?? 0,

      profit_factor: metrics.profitFactor ?? 0,

    },

    fingerprint: extras.digest ?? extras.fingerprint ?? null,

    full_log_uri: extras.full_log_uri ?? null,

    simulation_only: true,

    cmc_endpoints: backtestOutput.cmcEndpointsUsed || [],

  };

}



const STRATEGY_MODULES = {

  momentum: () => import("../strategies/momentumMerger.js"),

  sentiment: () => import("../strategies/sentimentDivergence.js"),

  regime: () => import("../strategies/regimeDetector.js"),

};



export async function runBacktestJob(strategyName, fromDate, toDate, options = {}) {

  const loader = STRATEGY_MODULES[strategyName];

  if (!loader) {

    throw new Error(`Unknown strategy "${strategyName}". Use: ${Object.keys(STRATEGY_MODULES).join(", ")}`);

  }

  const mod = await loader();

  const StrategyClass = mod.default;

  const strategy = new StrategyClass();

  const result = await runBacktest(strategy, fromDate, toDate, { symbol: options.symbol ?? "BNB" });

  const jobResult = toJobResult(result, { digest: options.digest });

  return { ...result, jobResult };

}



function normalizeTs(ts) {
  return new Date(ts).toISOString();
}

function filterBarsByDate(bars, startDate, endDate) {

  const start = new Date(startDate).getTime();

  const end = new Date(endDate).getTime();

  return bars.filter((b) => {

    const t = new Date(b.timestamp).getTime();

    return t >= start && t <= end;

  });

}



export { SLIPPAGE, FEE };


