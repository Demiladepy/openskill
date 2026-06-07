/**
 * Track 2 backtest engine — simulation only, no live execution.
 */
const SLIPPAGE = 0.001; // 0.1%
const FEE = 0.0005; // 0.05%

/**
 * @param {Array<{ timestamp: string, close: number }>} bars
 * @param {Array<{ timestamp: string, signal: string, confidence?: number, strength?: number }>} signals
 * @param {{ initialCapital?: number, positionSizePct?: number }} opts
 */
export function runBacktestSimulation(bars, signals, opts = {}) {
  const capital0 = opts.initialCapital ?? 10000;
  const positionSizePct = (opts.positionSizePct ?? 100) / 100;
  const signalByTs = new Map(signals.map((s) => [s.timestamp, s]));

  let cash = capital0;
  let position = null;
  /** @type {Array<Record<string, unknown>>} */
  const replay = [];
  /** @type {number[]} */
  const tradeReturns = [];
  /** @type {number[]} */
  const equity = [capital0];
  let peak = capital0;
  let maxDrawdownPct = 0;

  for (const bar of bars) {
    const sig = signalByTs.get(bar.timestamp);
    const px = bar.close * (1 + SLIPPAGE);

    if (sig?.signal === "buy" && !position) {
      const spend = cash * positionSizePct;
      const fee = spend * FEE;
      const units = (spend - fee) / px;
      position = { entryTs: bar.timestamp, entryPrice: px, units, spend };
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

    if (sig?.signal === "sell" && position) {
      const gross = position.units * (bar.close * (1 - SLIPPAGE));
      const fee = gross * FEE;
      const proceeds = gross - fee;
      cash += proceeds;
      const ret = (proceeds - position.spend) / position.spend;
      tradeReturns.push(ret);
      replay.push({
        timestamp: bar.timestamp,
        action: "exit",
        price: bar.close,
        signal: sig.signal,
        confidence: sig.confidence ?? sig.strength ?? null,
        pnlPct: ret * 100,
        equity: cash,
      });
      position = null;
    }

    const mark = cash + (position ? position.units * bar.close : 0);
    equity.push(mark);
    peak = Math.max(peak, mark);
    const dd = peak > 0 ? ((peak - mark) / peak) * 100 : 0;
    maxDrawdownPct = Math.max(maxDrawdownPct, dd);
  }

  const totalReturnPct = ((equity.at(-1) - capital0) / capital0) * 100;
  const sharpe = sharpeAnnualized(tradeReturns);
  const winRatePct =
    tradeReturns.length === 0 ? 0 : (tradeReturns.filter((r) => r > 0).length / tradeReturns.length) * 100;

  return {
    metrics: {
      totalReturnPct: round(totalReturnPct),
      sharpeRatio: sharpe,
      maxDrawdownPct: round(maxDrawdownPct),
      winRatePct: round(winRatePct),
      trades: tradeReturns.length,
    },
    replay,
    equity,
  };
}

function sharpeAnnualized(returns) {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return round((mean / std) * Math.sqrt(252));
}

function round(n) {
  return Number(n.toFixed(4));
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
  });

  const payload = {
    strategy: strategy.name,
    range,
    metrics: sim.metrics,
    replay: sim.replay,
    rulesPlainEnglish: result.rulesPlainEnglish || [],
    cmcEndpointsUsed: result.cmcEndpointsUsed || [],
  };

  strategy.lastBacktest = payload;
  return payload;
}

/** @param {Array<{ timestamp: string }>} bars */
function filterBarsByDate(bars, startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return bars.filter((b) => {
    const t = new Date(b.timestamp).getTime();
    return t >= start && t <= end;
  });
}

export { SLIPPAGE, FEE };
