import { sharpeFromReturns, round } from "./sharpe.js";
import { maxDrawdownFromEquity } from "./maxdd.js";

/**
 * Compute quant metrics from a backtest result object.
 * Accepts CLI output shape or raw { replay, equityCurve, metrics, trades }.
 * @param {Record<string, unknown>} data
 */
export function computeMetrics(data) {
  const replay = /** @type {Array<Record<string, unknown>>} */ (data.replay || data.trades || []);
  const equityCurve = /** @type {number[]} */ (
    data.equityCurve || data.equity || buildEquityFromReplay(replay)
  );

  const tradeReturns = replay
    .filter((r) => r.action === "exit" && typeof r.pnlPct === "number")
    .map((r) => Number(r.pnlPct) / 100);

  const embedded = /** @type {Record<string, number> | undefined} */ (data.metrics);
  const initial = equityCurve[0] ?? 10000;
  const final = equityCurve.at(-1) ?? initial;
  const totalReturnPct = embedded?.totalReturnPct ?? round(((final - initial) / initial) * 100);

  return {
    sharpeRatio: embedded?.sharpeRatio ?? sharpeFromReturns(tradeReturns),
    maxDrawdownPct: embedded?.maxDrawdownPct ?? maxDrawdownFromEquity(equityCurve),
    totalReturnPct,
    winRatePct:
      embedded?.winRatePct ??
      (tradeReturns.length
        ? round((tradeReturns.filter((r) => r > 0).length / tradeReturns.length) * 100)
        : 0),
    trades: embedded?.trades ?? tradeReturns.length,
  };
}

function buildEquityFromReplay(replay) {
  const curve = [];
  for (const row of replay) {
    if (typeof row.equity === "number") curve.push(row.equity);
  }
  return curve.length ? curve : [10000];
}
